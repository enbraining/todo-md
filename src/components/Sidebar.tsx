import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '@/stores/useStore';
import { FolderItem } from '@/types';
import Settings from './Settings';

interface AppSettings {
  daily_folder: string | null;
  weekly_folder: string | null;
  monthly_folder: string | null;
}

interface SidebarProps {
  onDataChange: () => void;
}

interface TreeItemProps {
  item: FolderItem;
  depth: number;
  watchFolder: string;
  onDataChange: () => void;
}

function TreeItem({ item, depth, watchFolder, onDataChange }: TreeItemProps) {
  const { selectedFile, setSelectedFile, setFileContent, expandedFolders, toggleFolder } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showInput, setShowInput] = useState<'file' | 'folder' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const isExpanded = expandedFolders.has(item.path);
  const isSelected = selectedFile?.relative_path === item.path;
  const fullPath = `${watchFolder}/${item.path}`.replace(/\\/g, '/');

  const handleClick = async () => {
    if (item.is_folder) {
      toggleFolder(item.path);
    } else {
      try {
        const content = await invoke<string>('read_file', { path: fullPath });
        setSelectedFile({
          name: item.name,
          path: fullPath,
          relative_path: item.path,
        });
        setFileContent(content, true);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  };

  const handleCreate = async (type: 'file' | 'folder') => {
    if (!inputValue.trim()) {
      setShowInput(null);
      return;
    }

    try {
      const targetPath = item.is_folder ? fullPath : watchFolder;
      if (type === 'folder') {
        await invoke('create_folder', { folderPath: targetPath, name: inputValue });
      } else {
        await invoke('create_file', { folderPath: targetPath, name: inputValue });
      }
      onDataChange();
    } catch (error) {
      console.error('Failed to create:', error);
    }

    setInputValue('');
    setShowInput(null);
  };

  const handleDelete = async () => {
    if (confirm(`"${item.name}"을(를) 삭제하시겠습니까?`)) {
      try {
        await invoke('delete_item', { path: fullPath });
        onDataChange();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
    setShowMenu(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-800 rounded text-sm ${
          isSelected ? 'bg-gray-800 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {item.is_folder ? (
          <span className="w-4 text-center text-xs">{isExpanded ? '▼' : '▶'}</span>
        ) : (
          <span className="w-4" />
        )}
        <span className={item.is_folder ? 'text-yellow-400' : 'text-gray-400'}>
          {item.is_folder ? '📁' : '📄'}
        </span>
        <span className="truncate flex-1">{item.name}</span>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 text-sm"
            style={{ marginLeft: `${depth * 12 + 20}px` }}
          >
            {item.is_folder && (
              <>
                <button
                  className="w-full px-4 py-1 text-left hover:bg-gray-700 text-gray-200"
                  onClick={() => { setShowInput('file'); setShowMenu(false); }}
                >
                  새 파일
                </button>
                <button
                  className="w-full px-4 py-1 text-left hover:bg-gray-700 text-gray-200"
                  onClick={() => { setShowInput('folder'); setShowMenu(false); }}
                >
                  새 폴더
                </button>
                <hr className="border-gray-700 my-1" />
              </>
            )}
            <button
              className="w-full px-4 py-1 text-left hover:bg-gray-700 text-red-400"
              onClick={handleDelete}
            >
              삭제
            </button>
          </div>
        </>
      )}

      {showInput && (
        <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-white"
            placeholder={showInput === 'folder' ? '폴더 이름' : '파일 이름'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate(showInput);
              if (e.key === 'Escape') setShowInput(null);
            }}
            autoFocus
          />
        </div>
      )}

      {item.is_folder && isExpanded && (
        <div>
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              watchFolder={watchFolder}
              onDataChange={onDataChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onDataChange }: SidebarProps) {
  const { fileTree, watchFolder, setWatchFolder, setSelectedFile, setFileContent } = useStore();
  const [showRootInput, setShowRootInput] = useState<'file' | 'folder' | null>(null);
  const [rootInputValue, setRootInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    daily_folder: null,
    weekly_folder: null,
    monthly_folder: null,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await invoke<AppSettings>('get_settings');
        setSettings(s);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [showSettings]);

  const handleCreatePeriodicNote = async (type: 'daily' | 'weekly' | 'monthly') => {
    if (!watchFolder) return;

    const folderMap = {
      daily: settings.daily_folder,
      weekly: settings.weekly_folder,
      monthly: settings.monthly_folder,
    };

    const targetFolder = folderMap[type];
    if (!targetFolder) {
      alert(`${type === 'daily' ? '일간' : type === 'weekly' ? '주간' : '월간'} 노트 폴더가 설정되지 않았습니다. 설정에서 폴더를 지정해주세요.`);
      setShowSettings(true);
      return;
    }

    try {
      const filePath = await invoke<string>('create_periodic_note', {
        watchFolder,
        targetFolder,
        noteType: type,
      });

      onDataChange();

      const content = await invoke<string>('read_file', { path: filePath });
      const relativePath = filePath.replace(watchFolder, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
      setSelectedFile({
        name: filePath.split(/[/\\]/).pop() || '',
        path: filePath,
        relative_path: relativePath,
      });
      setFileContent(content, true);
    } catch (error) {
      console.error('Failed to create periodic note:', error);
    }
  };

  const handleFolderSelect = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '마크다운 파일이 있는 폴더를 선택하세요',
    });

    if (selected && typeof selected === 'string') {
      setWatchFolder(selected);
      onDataChange();
    }
  };

  const handleRootCreate = async (type: 'file' | 'folder') => {
    if (!rootInputValue.trim() || !watchFolder) {
      setShowRootInput(null);
      return;
    }

    try {
      if (type === 'folder') {
        await invoke('create_folder', { folderPath: watchFolder, name: rootInputValue });
      } else {
        await invoke('create_file', { folderPath: watchFolder, name: rootInputValue });
      }
      onDataChange();
    } catch (error) {
      console.error('Failed to create:', error);
    }

    setRootInputValue('');
    setShowRootInput(null);
  };

  const folderName = watchFolder?.split(/[/\\]/).pop() || '';

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">Todo.md</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="설정"
          >
            ⚙️
          </button>
        </div>
        <button
          onClick={handleFolderSelect}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          폴더 선택
        </button>

        {watchFolder && (
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => handleCreatePeriodicNote('daily')}
              className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="오늘의 노트 생성"
            >
              📅 일간
            </button>
            <button
              onClick={() => handleCreatePeriodicNote('weekly')}
              className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="이번 주 노트 생성"
            >
              📆 주간
            </button>
            <button
              onClick={() => handleCreatePeriodicNote('monthly')}
              className="flex-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              title="이번 달 노트 생성"
            >
              🗓️ 월간
            </button>
          </div>
        )}
      </div>

      {watchFolder && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
            <span className="text-sm font-medium text-gray-200 truncate" title={watchFolder}>
              {folderName}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setShowRootInput('file')}
                className="p-1 hover:bg-gray-700 rounded text-xs"
                title="새 파일"
              >
                📄+
              </button>
              <button
                onClick={() => setShowRootInput('folder')}
                className="p-1 hover:bg-gray-700 rounded text-xs"
                title="새 폴더"
              >
                📁+
              </button>
            </div>
          </div>

          {showRootInput && (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                type="text"
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-white"
                placeholder={showRootInput === 'folder' ? '폴더 이름' : '파일 이름'}
                value={rootInputValue}
                onChange={(e) => setRootInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRootCreate(showRootInput);
                  if (e.key === 'Escape') setShowRootInput(null);
                }}
                autoFocus
              />
            </div>
          )}

          <div className="py-1">
            {fileTree.length === 0 ? (
              <p className="text-gray-500 text-sm px-4 py-4">파일이 없습니다</p>
            ) : (
              fileTree.map((item) => (
                <TreeItem
                  key={item.path}
                  item={item}
                  depth={0}
                  watchFolder={watchFolder}
                  onDataChange={onDataChange}
                />
              ))
            )}
          </div>
        </div>
      )}

      {!watchFolder && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">폴더를 선택하세요</p>
        </div>
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
