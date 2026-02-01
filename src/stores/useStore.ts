import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FileInfo, Todo, FolderItem } from '@/types';

interface AppState {
  watchFolder: string | null;
  fileTree: FolderItem[];
  selectedFile: FileInfo | null;
  fileContent: string;
  todos: Todo[];
  selectedDate: Date;
  expandedFolders: Set<string>;
  contentVersion: number;

  setWatchFolder: (folder: string | null) => void;
  setFileTree: (tree: FolderItem[]) => void;
  setSelectedFile: (file: FileInfo | null) => void;
  setFileContent: (content: string, external?: boolean) => void;
  setTodos: (todos: Todo[]) => void;
  setSelectedDate: (date: Date) => void;
  toggleFolder: (path: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      watchFolder: null,
      fileTree: [],
      selectedFile: null,
      fileContent: '',
      todos: [],
      selectedDate: new Date(),
      expandedFolders: new Set<string>(),
      contentVersion: 0,

      setWatchFolder: (folder) => set({ watchFolder: folder }),
      setFileTree: (tree) => set({ fileTree: tree }),
      setSelectedFile: (file) => set({ selectedFile: file }),
      setFileContent: (content, external) => {
        if (external) {
          set((state) => ({
            fileContent: content,
            contentVersion: state.contentVersion + 1,
          }));
        } else {
          set({ fileContent: content });
        }
      },
      setTodos: (todos) => set({ todos }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleFolder: (path) => set((state) => {
        const newSet = new Set(state.expandedFolders);
        if (newSet.has(path)) {
          newSet.delete(path);
        } else {
          newSet.add(path);
        }
        return { expandedFolders: newSet };
      }),
    }),
    {
      name: 'md-todo-storage',
      partialize: (state) => ({ watchFolder: state.watchFolder }),
    }
  )
);
