import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';

export default function Calendar() {
  const { todos, selectedDate, setSelectedDate } = useStore();

  const currentMonth = selectedDate;

  const todosByDate = useMemo(() => {
    const map = new Map<string, number>();
    todos.forEach((todo) => {
      if (todo.due_date && !todo.completed) {
        const count = map.get(todo.due_date) || 0;
        map.set(todo.due_date, count + 1);
      }
    });
    return map;
  }, [todos]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedDate(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-200 rounded"
        >
          &lt;
        </button>
        <h2 className="font-semibold">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          onClick={() => setSelectedDate(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-200 rounded"
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'yyyy-MM-dd');
        const todoCount = todosByDate.get(formattedDate) || 0;
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const dayOfWeek = day.getDay();

        const clonedDay = day;

        days.push(
          <button
            key={day.toString()}
            onClick={() => setSelectedDate(clonedDay)}
            className={`
              relative p-1 h-10 text-sm rounded
              ${!isCurrentMonth ? 'text-gray-300' : ''}
              ${dayOfWeek === 0 && isCurrentMonth ? 'text-red-500' : ''}
              ${dayOfWeek === 6 && isCurrentMonth ? 'text-blue-500' : ''}
              ${isToday ? 'bg-blue-100' : ''}
              ${isSelected ? 'ring-2 ring-blue-500' : ''}
              hover:bg-gray-100
            `}
          >
            <span>{format(day, 'd')}</span>
            {todoCount > 0 && (
              <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {todoCount > 9 ? '9+' : todoCount}
              </span>
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="p-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
