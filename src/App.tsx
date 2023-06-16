/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable max-len */
import {
  FC,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import cn from 'classnames';
import './App.scss';
import { UserWarning } from './UserWarning';
import {
  getTodos,
  removeTodo,
  addTodoToServer,
  changeTodo,
} from './api/todos';
import { TodosList } from './components/TodosList/TodosList';
import { Todo } from './types/Todo';
import { ErrorInfo } from './components/ErrorInfo/ErrorInfo';
import {
  visibleTodos,
  StatusValue,
  getcompletedTodosIds,
} from './utils/todoUtils';

const USER_ID = 10725;

export const App: FC = () => {
  const formRef = useRef<HTMLInputElement | null>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [queryTodo, setQueryTodo] = useState('');
  const [loadingTodos, setLoadingTodos] = useState<number[]>([]);
  const [statusTodo, setstatusTodo] = useState<StatusValue>(StatusValue.ALL);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  const [isInputDisabled, setIsInputDisabled] = useState(false);

  const [visibleError, setVisibleError] = useState('');

  const completed = getcompletedTodosIds(todos);

  const isToggleAll = todos.every(todo => todo.completed);

  const getTodosFromServer = async () => {
    try {
      const fetchedTodos = await getTodos(USER_ID);

      setTodos(fetchedTodos as Todo[]);
    } catch (error) {
      setVisibleError('Unable to load a todos');
    }
  };

  useEffect(() => {
    if (formRef.current) {
      formRef.current.focus();
    }

    getTodosFromServer();
  }, [tempTodo]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const removesTodo = async (todosId: number[]) => {
    try {
      await Promise.all(
        todosId.map(async (id) => {
          setLoadingTodos((prevIds) => [...prevIds, id]);
          await removeTodo(id);
        }),
      );

      const updatedTodos = todos.filter(todo => !todosId.includes(todo.id));

      setTodos(updatedTodos);
    } catch (error) {
      setVisibleError('Unable to delete a todo');
    } finally {
      setLoadingTodos([]);
    }
  };

  const addTodo = async () => {
    try {
      const newTodo = {
        title: queryTodo,
        completed: false,
        userId: USER_ID,
      };

      const tempId = 0;

      setTempTodo({
        ...newTodo,
        id: tempId,
      });
      setIsInputDisabled(true);
      setLoadingTodos([tempId]);

      const setNewTodo = await addTodoToServer('/todos', newTodo);

      setTodos((currentTodos) => [...currentTodos, setNewTodo]);
    } catch (error) {
      setVisibleError('Unable to add a todo');
    } finally {
      setIsInputDisabled(false);
      setTempTodo(null);
      setLoadingTodos([]);
      setQueryTodo('');
    }
  };

  const handleOnSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!queryTodo.trim()) {
      setQueryTodo('');
      setVisibleError('Title can\'t be empty');

      return;
    }

    addTodo();
  };

  const handleOnQuery = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setQueryTodo(event.target.value);
  };

  const changeTodoStatus = async (todoId: number, toggleAll?: boolean) => {
    setLoadingTodos((prevIds) => [...prevIds, todoId]);

    try {
      const todoToUpdate = todos.find(todo => todo.id === todoId);

      if (todoToUpdate) {
        const newCompletedValue = toggleAll !== undefined ? toggleAll : todoToUpdate.completed;

        const updatedTodo = await changeTodo(todoId, {
          ...todoToUpdate,
          completed: !newCompletedValue,
        });

        setTodos(prevTodos => prevTodos
          .map(todo => (
            todo.id === updatedTodo.id
              ? updatedTodo
              : todo)));
      }
    } catch (error) {
      setVisibleError('Unable to update a todo');
    } finally {
      setLoadingTodos([]);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={cn('todoapp__toggle-all', {
              active: isToggleAll,
            })}
            onClick={() => todos.map(todo => changeTodoStatus(todo.id, isToggleAll))}
          />

          <form
            onSubmit={handleOnSubmit}
          >
            <input
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={queryTodo}
              onChange={handleOnQuery}
              disabled={isInputDisabled}
              ref={formRef}
            />
          </form>
        </header>

        <TodosList
          todos={visibleTodos(todos, statusTodo)}
          tempTodo={tempTodo}
          removesTodo={removesTodo}
          loadingTodos={loadingTodos}
          changeTodoStatus={changeTodoStatus}
          handleOnQuery={handleOnQuery}
        />

        {todos.length > 0 && (
          <footer className="todoapp__footer">
            <span className="todo-count">
              {`${completed.length} items left`}
            </span>

            <nav className="filter">
              <a
                href="#/"
                className={cn('filter__link', {
                  selected: statusTodo === StatusValue.ALL,
                })}
                defaultValue="all"
                onClick={() => setstatusTodo(StatusValue.ALL)}
              >
                All
              </a>

              <a
                href="#/active"
                className={cn('filter__link', {
                  selected: statusTodo === StatusValue.ACTIVE,
                })}
                onClick={() => setstatusTodo(StatusValue.ACTIVE)}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={cn('filter__link', {
                  selected: statusTodo === StatusValue.COMPLETED,
                })}
                onClick={() => setstatusTodo(StatusValue.COMPLETED)}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              disabled={!completed.length}
              onClick={() => {
                removesTodo(completed);
                setLoadingTodos(completed);
                setstatusTodo(StatusValue.ALL);
              }}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <ErrorInfo
        visibleError={visibleError}
        setVisibleError={setVisibleError}
      />
    </div>
  );
};
