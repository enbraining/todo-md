import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import TodoItem from './TodoItem';
import { buildTodoTree } from '@/utils/todoTree';

interface WeeklyViewProps {
  onUpdate: () => void;
}

export default function WeeklyView({ onUpdate }: WeeklyViewProps) {
  const { todos, selectedDate } = useStore();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  // 현재 선택된 날짜의 년/월/주차 계산
  const currentYear = format(selectedDate, 'yyyy');
  const currentMonth = format(selectedDate, 'MM');
  const currentWeekOfMonth = Math.ceil(selectedDate.getDate() / 7);

  const todosForWeek = useMemo(() => {
    const filtered = todos
      .filter((todo) => {
        // 1. due_date가 현재 주에 해당하는 경우
        if (todo.due_date) {
          try {
            const dueDate = parseISO(todo.due_date);
            if (isWithinInterval(dueDate, { start: weekStart, end: weekEnd })) {
              return true;
            }
          } catch {
            // 파싱 실패시 무시
          }
        }

        // 2. 파일 경로가 weekly/YYYY/MM/W{주차}.md 형식인 경우
        const weeklyPathMatch = todo.file_path.match(/weekly\/(\d{4})\/(\d{2})\/W(\d+)\.md$/i);
        if (weeklyPathMatch) {
          const [, year, month, week] = weeklyPathMatch;
          if (year === currentYear && month === currentMonth && parseInt(week) === currentWeekOfMonth) {
            return true;
          }
        }

        return false;
      })
      .sort((a, b) => {
        const dateA = a.due_date || '';
        const dateB = b.due_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.due_time || '99:99';
        const timeB = b.due_time || '99:99';
        return timeA.localeCompare(timeB);
      });
    return buildTodoTree(filtered);
  }, [todos, weekStart, weekEnd, currentYear, currentMonth, currentWeekOfMonth]);

  const unscheduledTodos = useMemo(() => {
    const filtered = todos.filter((todo) => !todo.due_date && !todo.file_path.match(/weekly\//i));
    return buildTodoTree(filtered);
  }, [todos]);

  return (
    <div className="p-4 overflow-y-auto h-full">
      <h3 className="font-semibold mb-1">
        {format(weekStart, 'M월 d일', { locale: ko })} - {format(weekEnd, 'M월 d일', { locale: ko })}
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        {currentYear}년 {currentMonth}월 {currentWeekOfMonth}주차
      </p>

      {todosForWeek.length > 0 ? (
        <div className="space-y-2">
          {todosForWeek.map((todo) => (
            <TodoItem key={todo.id} todo={todo} showDate onUpdate={onUpdate} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">
          이번 주에 할 일이 없습니다
        </p>
      )}

      {unscheduledTodos.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">
            날짜 미지정 ({unscheduledTodos.length})
          </h4>
          <div className="space-y-2">
            {unscheduledTodos.slice(0, 10).map((todo) => (
              <TodoItem key={todo.id} todo={todo} showDate onUpdate={onUpdate} />
            ))}
            {unscheduledTodos.length > 10 && (
              <p className="text-xs text-gray-400 pl-2">
                +{unscheduledTodos.length - 10}개 더...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
