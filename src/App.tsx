import { useEffect, useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '@/stores/useStore';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import Calendar from '@/components/Calendar';
import Timeline from '@/components/Timeline';
import WeeklyView from '@/components/WeeklyView';
import ResizeHandle from '@/components/ResizeHandle';
import { FolderItem, Todo } from '@/types';

export default function App() {
  const { watchFolder, setFileTree, setTodos, selectedFile, setFileContent } = useStore();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [leftWidth, setLeftWidth] = useState(256);
  const [rightWidth, setRightWidth] = useState(320);

  const loadData = useCallback(async (reloadFile = false) => {
    if (!watchFolder) return;

    try {
      const tree = await invoke<FolderItem[]>('get_file_tree', {
        folderPath: watchFolder,
      });
      setFileTree(tree);

      const todos = await invoke<Todo[]>('get_all_todos', {
        folderPath: watchFolder,
      });
      setTodos(todos);

      // 현재 선택된 파일 내용도 다시 로드
      if (reloadFile && selectedFile) {
        const content = await invoke<string>('read_file', { path: selectedFile.path });
        setFileContent(content, true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [watchFolder, setFileTree, setTodos, selectedFile, setFileContent]);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(180, Math.min(400, w + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(250, Math.min(500, w + delta)));
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      <div style={{ width: leftWidth }} className="flex-shrink-0">
        <Sidebar onDataChange={loadData} />
      </div>

      <ResizeHandle side="left" onResize={handleLeftResize} />

      <Editor onSave={loadData} />

      <ResizeHandle side="right" onResize={handleRightResize} />

      <div style={{ width: rightWidth }} className="border-l bg-white flex flex-col flex-shrink-0">
        <div className="border-b">
          <Calendar />
        </div>
        <div className="flex border-b">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 py-2 text-sm font-medium ${
              viewMode === 'daily'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            일간
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex-1 py-2 text-sm font-medium ${
              viewMode === 'weekly'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            주간
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {viewMode === 'daily' ? (
            <Timeline onUpdate={() => loadData(true)} />
          ) : (
            <WeeklyView onUpdate={() => loadData(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
