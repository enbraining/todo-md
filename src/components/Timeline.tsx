import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import TodoItem from './TodoItem';
import { buildTodoTree } from '@/utils/todoTree';

interface TimelineProps {
  onUpdate: () => void;
}

export default function Timeline({ onUpdate }: TimelineProps) {
  const { todos, selectedDate } = useStore();

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const todosForDate = useMemo(() => {
    const filtered = todos
      .filter((todo) => todo.due_date === selectedDateStr)
      .sort((a, b) => {
        if (!a.due_time && !b.due_time) return 0;
        if (!a.due_time) return 1;
        if (!b.due_time) return -1;
        return a.due_time.localeCompare(b.due_time);
      });
    return buildTodoTree(filtered);
  }, [todos, selectedDateStr]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const todosByHour = useMemo(() => {
    const map = new Map<number, typeof todos>();
    todosForDate.forEach((todo) => {
      if (todo.due_time) {
        const hour = parseInt(todo.due_time.split(':')[0], 10);
        const existing = map.get(hour) || [];
        map.set(hour, [...existing, todo]);
      }
    });
    return map;
  }, [todosForDate]);

  const unscheduledTodos = todosForDate.filter((todo) => !todo.due_time);

  return (
    <div className="p-4 overflow-y-auto h-full">
      <h3 className="font-semibold mb-4">
        {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
      </h3>

      {unscheduledTodos.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm text-gray-500 mb-2">시간 미지정</h4>
          <div className="space-y-2">
            {unscheduledTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0">
        {hours.map((hour) => {
          const hourTodos = todosByHour.get(hour) || [];
          const hasItems = hourTodos.length > 0;

          return (
            <div
              key={hour}
              className={`flex border-t border-gray-100 ${hasItems ? 'min-h-16 py-1' : 'h-6'}`}
            >
              <div className="w-12 text-xs text-gray-400 pr-2 pt-1 text-right shrink-0">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 pl-2 space-y-1">
                {hourTodos.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {todosForDate.length === 0 && (
        <p className="text-gray-400 text-sm text-center mt-8">
          이 날짜에 할 일이 없습니다
        </p>
      )}
    </div>
  );
}
