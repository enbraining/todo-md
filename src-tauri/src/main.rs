#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use chrono::Datelike;
use glob::glob;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize)]
struct FileInfo {
    name: String,
    path: String,
    relative_path: String,
}

#[derive(Serialize, Deserialize)]
struct Todo {
    id: String,
    text: String,
    completed: bool,
    due_date: Option<String>,
    due_time: Option<String>,
    file_path: String,
    line_number: usize,
    indent_level: usize,
    is_task: bool,  // true면 체크박스가 있는 TODO, false면 일반 리스트
}

#[tauri::command]
fn get_markdown_files(folder_path: String) -> Result<Vec<FileInfo>, String> {
    let pattern = format!("{}/**/*.md", folder_path.replace("\\", "/"));
    let mut files = Vec::new();

    for entry in glob(&pattern).map_err(|e| e.to_string())? {
        match entry {
            Ok(path) => {
                let path_str = path.to_string_lossy().to_string();
                let name = path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                let relative = path_str
                    .strip_prefix(&folder_path)
                    .unwrap_or(&path_str)
                    .trim_start_matches(['/', '\\'])
                    .replace("\\", "/");

                files.push(FileInfo {
                    name,
                    path: path_str,
                    relative_path: relative,
                });
            }
            Err(_) => continue,
        }
    }

    Ok(files)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_todos(folder_path: String) -> Result<Vec<Todo>, String> {
    let pattern = format!("{}/**/*.md", folder_path.replace("\\", "/"));
    let mut todos = Vec::new();

    let todo_regex = regex::Regex::new(r"^(\s*)-\s*\[([ xX])\]\s*(.+)$").unwrap();
    let list_regex = regex::Regex::new(r"^(\s*)-\s+(.+)$").unwrap();
    let due_regex = regex::Regex::new(r"--due=(\S+)").unwrap();

    for entry in glob(&pattern).map_err(|e| e.to_string())? {
        match entry {
            Ok(path) => {
                let content = match fs::read_to_string(&path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                let path_str = path.to_string_lossy().to_string();
                let relative = path_str
                    .strip_prefix(&folder_path)
                    .unwrap_or(&path_str)
                    .trim_start_matches(['/', '\\'])
                    .replace("\\", "/");

                for (line_num, line) in content.lines().enumerate() {
                    // 먼저 TODO 체크박스가 있는 항목 확인
                    if let Some(caps) = todo_regex.captures(line) {
                        let indent = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                        let indent_level = indent.chars().filter(|c| *c == ' ').count() / 4
                            + indent.chars().filter(|c| *c == '\t').count();

                        let completed = caps.get(2).map(|m| {
                            let s = m.as_str().to_lowercase();
                            s == "x" || s == "/"
                        }).unwrap_or(false);
                        let raw_text = caps.get(3).map(|m| m.as_str().to_string()).unwrap_or_default();

                        let mut due_date = None;
                        let mut due_time = None;

                        let due_value_opt = due_regex.captures(&raw_text)
                            .and_then(|c| c.get(1))
                            .map(|m| m.as_str().to_string());

                        let text = due_regex.replace(&raw_text, "").trim().to_string();

                        if let Some(due_value) = due_value_opt {
                            if due_value.contains('T') {
                                let parts: Vec<&str> = due_value.split('T').collect();
                                due_date = Some(parts[0].to_string());
                                if parts.len() > 1 {
                                    due_time = Some(parts[1].to_string());
                                }
                            } else if due_value.contains(':') {
                                due_time = Some(due_value.to_string());
                            } else {
                                due_date = Some(due_value.to_string());
                            }
                        }

                        todos.push(Todo {
                            id: format!("{}:{}", relative, line_num + 1),
                            text,
                            completed,
                            due_date,
                            due_time,
                            file_path: relative.clone(),
                            line_number: line_num + 1,
                            indent_level,
                            is_task: true,
                        });
                    } else if let Some(caps) = list_regex.captures(line) {
                        // 일반 리스트 항목 (체크박스 없음)
                        let indent = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                        let indent_level = indent.chars().filter(|c| *c == ' ').count() / 4
                            + indent.chars().filter(|c| *c == '\t').count();
                        let text = caps.get(2).map(|m| m.as_str().trim().to_string()).unwrap_or_default();

                        // 빈 텍스트가 아닌 경우에만 추가
                        if !text.is_empty() {
                            todos.push(Todo {
                                id: format!("{}:{}", relative, line_num + 1),
                                text,
                                completed: false,
                                due_date: None,
                                due_time: None,
                                file_path: relative.clone(),
                                line_number: line_num + 1,
                                indent_level,
                                is_task: false,
                            });
                        }
                    }
                }
            }
            Err(_) => continue,
        }
    }

    Ok(todos)
}

#[derive(Serialize, Deserialize)]
struct FolderItem {
    name: String,
    path: String,
    is_folder: bool,
    children: Vec<FolderItem>,
}

#[tauri::command]
fn get_file_tree(folder_path: String) -> Result<Vec<FolderItem>, String> {
    fn build_tree(dir: &Path, base: &Path) -> Vec<FolderItem> {
        let mut items = Vec::new();

        if let Ok(entries) = fs::read_dir(dir) {
            let mut entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
            entries.sort_by(|a, b| {
                let a_is_dir = a.path().is_dir();
                let b_is_dir = b.path().is_dir();
                match (a_is_dir, b_is_dir) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.file_name().cmp(&b.file_name()),
                }
            });

            for entry in entries {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();

                if name.starts_with('.') {
                    continue;
                }

                let relative = path.strip_prefix(base)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .replace("\\", "/");

                if path.is_dir() {
                    items.push(FolderItem {
                        name,
                        path: relative,
                        is_folder: true,
                        children: build_tree(&path, base),
                    });
                } else if name.ends_with(".md") {
                    items.push(FolderItem {
                        name,
                        path: relative,
                        is_folder: false,
                        children: vec![],
                    });
                }
            }
        }

        items
    }

    let base_path = Path::new(&folder_path);
    Ok(build_tree(base_path, base_path))
}

#[tauri::command]
fn create_folder(folder_path: String, name: String) -> Result<(), String> {
    let path = Path::new(&folder_path).join(&name);
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(folder_path: String, name: String) -> Result<(), String> {
    let file_name = if name.ends_with(".md") { name } else { format!("{}.md", name) };
    let path = Path::new(&folder_path).join(&file_name);
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_item(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_item(old_path: String, new_name: String) -> Result<(), String> {
    let old = Path::new(&old_path);
    let new = old.parent().unwrap_or(Path::new("")).join(&new_name);
    fs::rename(old, new).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone)]
struct AppSettings {
    daily_folder: Option<String>,
    weekly_folder: Option<String>,
    monthly_folder: Option<String>,
}

fn get_settings_path() -> std::path::PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("md-todo-calendar");
    fs::create_dir_all(&path).ok();
    path.push("settings.json");
    path
}

#[tauri::command]
fn get_settings() -> AppSettings {
    let path = get_settings_path();
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or(AppSettings {
            daily_folder: None,
            weekly_folder: None,
            monthly_folder: None,
        })
    } else {
        AppSettings {
            daily_folder: None,
            weekly_folder: None,
            monthly_folder: None,
        }
    }
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_periodic_note(watch_folder: String, target_folder: String, note_type: String) -> Result<String, String> {
    let now = chrono::Local::now();

    let (filename, title, content) = match note_type.as_str() {
        "daily" => {
            let date = now.format("%Y-%m-%d").to_string();
            let title = now.format("%Y년 %m월 %d일").to_string();
            let content = format!(
r#"# {}

## 오늘의 할 일
- [ ]

## 메모

"#, title);
            (format!("{}.md", date), title, content)
        }
        "weekly" => {
            let year = now.format("%Y").to_string();
            let month = now.format("%m").to_string();
            let day = now.day();
            let week_of_month = (day - 1) / 7 + 1;
            let title = format!("{}년 {}월 {}주차", year, month, week_of_month);
            let content = format!(
r#"# {}

## 이번 주 목표
- [ ]

## 월요일
- [ ]

## 화요일
- [ ]

## 수요일
- [ ]

## 목요일
- [ ]

## 금요일
- [ ]

## 주간 회고

"#, title);
            (format!("{}/{}/W{}.md", year, month, week_of_month), title, content)
        }
        "monthly" => {
            let date = now.format("%Y-%m").to_string();
            let title = now.format("%Y년 %m월").to_string();
            let content = format!(
r#"# {}

## 이번 달 목표
- [ ]

## 주요 일정

## 월간 회고

"#, title);
            (format!("{}.md", date), title, content)
        }
        _ => return Err("Invalid note type".to_string()),
    };

    let full_folder = Path::new(&watch_folder).join(&target_folder);
    let file_path = full_folder.join(&filename);

    // 파일 경로의 부모 디렉토리 생성 (중첩 폴더 포함)
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    if file_path.exists() {
        return Ok(file_path.to_string_lossy().to_string());
    }

    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[derive(Deserialize)]
struct TodoUpdate {
    file_path: String,
    line_number: usize,
    text: Option<String>,
    completed: Option<bool>,
    due_date: Option<String>,
    due_time: Option<String>,
}

#[tauri::command]
fn update_todo(watch_folder: String, update: TodoUpdate) -> Result<(), String> {
    let full_path = Path::new(&watch_folder).join(&update.file_path);
    let content = fs::read_to_string(&full_path).map_err(|e| e.to_string())?;
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    if update.line_number == 0 || update.line_number > lines.len() {
        return Err("Invalid line number".to_string());
    }

    let line_idx = update.line_number - 1;
    let line = &lines[line_idx];

    let todo_regex = regex::Regex::new(r"^(\s*)-\s*\[([ xX])\]\s*(.+)$").unwrap();
    let due_regex = regex::Regex::new(r"\s*--due=\S+").unwrap();

    if let Some(caps) = todo_regex.captures(line) {
        let indent = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let current_completed = caps.get(2).map(|m| m.as_str().to_lowercase() == "x").unwrap_or(false);
        let current_text = caps.get(3).map(|m| m.as_str()).unwrap_or("");

        let new_completed = update.completed.unwrap_or(current_completed);
        let checkbox = if new_completed { "x" } else { " " };

        let text_without_due = due_regex.replace(current_text, "").trim().to_string();
        let new_text = update.text.unwrap_or(text_without_due);

        let due_part = match (&update.due_date, &update.due_time) {
            (Some(date), Some(time)) if !date.is_empty() && !time.is_empty() => {
                format!(" --due={}T{}", date, time)
            }
            (Some(date), _) if !date.is_empty() => format!(" --due={}", date),
            (_, Some(time)) if !time.is_empty() => format!(" --due={}", time),
            _ => String::new(),
        };

        lines[line_idx] = format!("{}- [{}] {}{}", indent, checkbox, new_text, due_part);
    }

    fs::write(&full_path, lines.join("\n")).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_markdown_files,
            read_file,
            write_file,
            get_all_todos,
            get_file_tree,
            create_folder,
            create_file,
            delete_item,
            rename_item,
            get_settings,
            save_settings,
            create_periodic_note,
            update_todo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
