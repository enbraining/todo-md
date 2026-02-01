export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  due_date?: string;
  due_time?: string;
  file_path: string;
  line_number: number;
  indent_level: number;
  is_task: boolean;  // true면 체크박스가 있는 TODO, false면 일반 리스트
  children?: Todo[];
}

export interface FileInfo {
  name: string;
  path: string;
  relative_path: string;
}

export interface FolderItem {
  name: string;
  path: string;
  is_folder: boolean;
  children: FolderItem[];
}
