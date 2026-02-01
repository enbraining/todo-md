import { Todo } from '@/types';

export function buildTodoTree(todos: Todo[]): Todo[] {
  // 같은 파일의 TODO들을 line_number 순으로 정렬
  const sortedTodos = [...todos].sort((a, b) => {
    if (a.file_path !== b.file_path) return a.file_path.localeCompare(b.file_path);
    return a.line_number - b.line_number;
  });

  const result: Todo[] = [];
  const stack: { todo: Todo; level: number }[] = [];

  for (const todo of sortedTodos) {
    const todoWithChildren: Todo = { ...todo, children: [] };

    // 스택에서 현재 indent_level보다 작거나 같은 것들 제거
    while (stack.length > 0 && stack[stack.length - 1].level >= todo.indent_level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // 최상위 항목 - TODO(is_task)만 최상위로
      if (todo.is_task) {
        result.push(todoWithChildren);
        stack.push({ todo: todoWithChildren, level: todo.indent_level });
      }
      // 일반 리스트는 최상위에 표시하지 않음
    } else {
      // 부모의 children에 추가
      const parent = stack[stack.length - 1].todo;
      if (!parent.children) parent.children = [];
      parent.children.push(todoWithChildren);
      stack.push({ todo: todoWithChildren, level: todo.indent_level });
    }
  }

  return result;
}

export function filterTopLevelTodos(todos: Todo[]): Todo[] {
  const tree = buildTodoTree(todos);
  return tree;
}
