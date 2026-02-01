import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '@/stores/useStore';

interface AppSettings {
  daily_folder: string | null;
  weekly_folder: string | null;
  monthly_folder: string | null;
}

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { watchFolder } = useStore();
  const [settings, setSettings] = useState<AppSettings>({
    daily_folder: null,
    weekly_folder: null,
    monthly_folder: null,
  });
  const [saved, setSaved] = useState(false);

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
  }, []);

  const handleSave = async () => {
    try {
      await invoke('save_settings', { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">설정</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          <div>
            <h3 className="font-medium mb-3 text-gray-800">주기별 노트 저장 폴더</h3>
            <p className="text-sm text-gray-500 mb-4">
              선택한 폴더 ({watchFolder?.split(/[/\\]/).pop() || '없음'}) 내의 상대 경로를 입력하세요.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  일간 노트 폴더
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: daily 또는 journal/daily"
                  value={settings.daily_folder || ''}
                  onChange={(e) => setSettings({ ...settings, daily_folder: e.target.value || null })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주간 노트 폴더
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: weekly 또는 journal/weekly"
                  value={settings.weekly_folder || ''}
                  onChange={(e) => setSettings({ ...settings, weekly_folder: e.target.value || null })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  월간 노트 폴더
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="예: monthly 또는 journal/monthly"
                  value={settings.monthly_folder || ''}
                  onChange={(e) => setSettings({ ...settings, monthly_folder: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-between">
          {saved && (
            <span className="text-green-600 text-sm">저장되었습니다!</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
