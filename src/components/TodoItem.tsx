import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '@/stores/useStore';
import { Todo } from '@/types';

interface TodoItemProps {
  todo: Todo;
  showDate?: boolean;
  onUpdate: () => void;
  depth?: number;
}

export default function TodoItem({ todo, showDate = false, onUpdate, depth = 0 }: TodoItemProps) {
  const { watchFolder, selectedFile, setSelectedFile, setFileContent } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editDate, setEditDate] = useState(todo.due_date || '');
  const [editTime, setEditTime] = useState(todo.due_time?.slice(0, 5) || '');

  const hasChildren = todo.children && todo.children.length > 0;

  const getFullPath = () => {
    if (!watchFolder) return '';
    return `${watchFolder}/${todo.file_path}`.replace(/\\/g, '/');
  };

  const reloadCurrentFile = async () => {
    if (!watchFolder || !selectedFile) return;

    const normalizedSelected = selectedFile.relative_path.replace(/\\/g, '/');
    const normalizedTodo = todo.file_path.replace(/\\/g, '/');

    if (normalizedSelected === normalizedTodo) {
      try {
        const fullPath = getFullPath();
        const content = await invoke<string>('read_file', { path: fullPath });
        setFileContent(content, true);
      } catch (error) {
        console.error('Failed to reload file:', error);
      }
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!watchFolder) return;

    try {
      await invoke('update_todo', {
        watchFolder,
        update: {
          file_path: todo.file_path,
          line_number: todo.line_number,
          completed: !todo.completed,
          due_date: todo.due_date || '',
          due_time: todo.due_time || '',
        },
      });
      await reloadCurrentFile();
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleSave = async () => {
    if (!watchFolder) return;

    try {
      await invoke('update_todo', {
        watchFolder,
        update: {
          file_path: todo.file_path,
          line_number: todo.line_number,
          text: editText,
          due_date: editDate,
          due_time: editTime ? `${editTime}:00` : '',
        },
      });
      setIsEditing(false);
      await reloadCurrentFile();
      onUpdate();
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleOpenFile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!watchFolder) return;

    const fullPath = getFullPath();
    try {
      const content = await invoke<string>('read_file', { path: fullPath });
      setFileContent(content, true);
      setSelectedFile({
        name: todo.file_path.split(/[/\\]/).pop() || todo.file_path,
        path: fullPath,
        relative_path: todo.file_path.replace(/\\/g, '/'),
      });
    } catch (error) {
      console.error('Failed to load file:', error, fullPath);
      alert('파일을 열 수 없습니다: ' + fullPath);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditText(todo.text);
    setEditDate(todo.due_date || '');
    setEditTime(todo.due_time?.slice(0, 5) || '');
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  if (isEditing) {
    return (
      <div className="p-2 rounded bg-white border border-blue-300 shadow-sm space-y-2">
        <input
          type="text"
          className="w-full border rounded px-2 py-1 text-sm"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 border rounded px-2 py-1 text-sm"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
          />
          <input
            type="time"
            className="w-24 border rounded px-2 py-1 text-sm"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setIsEditing(false)}
            className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`
          p-2 rounded text-sm border-l-4
          ${todo.completed ? 'border-green-400 bg-green-50' : 'border-blue-400 bg-blue-50'}
        `}
      >
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <button
              onClick={handleToggleExpand}
              className="mt-0.5 w-4 h-4 flex items-center justify-center text-xs text-gray-500 hover:text-gray-700 shrink-0"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div className="w-4 shrink-0" />
          )}
          <button
            onClick={handleToggleComplete}
            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0
              ${todo.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-400 hover:border-blue-500'
              }`}
          >
            {todo.completed && '✓'}
          </button>
          <div
            className="flex-1 min-w-0 cursor-pointer hover:bg-white/50 rounded px-1 -mx-1"
            onClick={handleStartEdit}
          >
            <p className={todo.completed ? 'line-through text-gray-400' : ''}>
              {todo.text}
              {hasChildren && (
                <span className="ml-2 text-xs text-gray-400">
                  {(() => {
                    const tasks = todo.children!.filter(c => c.is_task);
                    if (tasks.length > 0) {
                      return `(${tasks.filter(c => c.completed).length}/${tasks.length})`;
                    }
                    return `(${todo.children!.length}개 항목)`;
                  })()}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              {showDate && todo.due_date && (
                <span className="font-medium">
                  {todo.due_date} {todo.due_time?.slice(0, 5)}
                </span>
              )}
              {!showDate && todo.due_time && (
                <span className="font-medium">{todo.due_time.slice(0, 5)}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenFile}
            className="text-xs text-gray-400 hover:text-blue-600 shrink-0"
            title="파일 열기"
          >
            📄
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
          {todo.children!.map((child) => (
            <div
              key={child.id}
              className={`p-1.5 rounded text-xs flex items-center gap-2 ${
                child.is_task && child.completed ? 'bg-green-50 text-gray-400' : 'bg-gray-50'
              }`}
            >
              {child.is_task ? (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!watchFolder) return;
                    try {
                      await invoke('update_todo', {
                        watchFolder,
                        update: {
                          file_path: child.file_path,
                          line_number: child.line_number,
                          completed: !child.completed,
                          due_date: child.due_date || '',
                          due_time: child.due_time || '',
                        },
                      });
                      await reloadCurrentFile();
                      onUpdate();
                    } catch (error) {
                      console.error('Failed to toggle child todo:', error);
                    }
                  }}
                  className={`w-3 h-3 rounded border flex items-center justify-center text-[10px] shrink-0
                    ${child.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-400'
                    }`}
                >
                  {child.completed && '✓'}
                </button>
              ) : (
                <span className="w-3 h-3 flex items-center justify-center text-gray-400 shrink-0">•</span>
              )}
              <span className={child.is_task && child.completed ? 'line-through' : ''}>
                {child.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
