import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '@/stores/useStore';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

interface EditorProps {
  onSave: () => void;
}

export default function Editor({ onSave }: EditorProps) {
  const { selectedFile, fileContent, setFileContent, contentVersion } = useStore();
  const saveTimeoutRef = useRef<number | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      setFileContent(value);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        if (!selectedFile) return;

        try {
          await invoke('write_file', {
            path: selectedFile.path,
            content: value,
          });
          onSave();
        } catch (error) {
          console.error('Failed to save file:', error);
        }
      }, 500);
    },
    [selectedFile, setFileContent, onSave]
  );

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
        <div className="text-center">
          <p className="text-lg">파일을 선택하세요</p>
          <p className="text-sm mt-2">왼쪽 사이드바에서 마크다운 파일을 선택하면 편집할 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b text-sm text-gray-600">
        {selectedFile.relative_path}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          key={`editor-${contentVersion}`}
          value={fileContent}
          height="100%"
          extensions={[markdown()]}
          onChange={handleChange}
          theme="light"
          className="h-full"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
          }}
        />
      </div>
    </div>
  );
}
