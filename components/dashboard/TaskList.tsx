'use client';

import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <Card className="p-6 shadow-xl border-0">
      <h3 className="text-lg font-bold text-brand-gray-dark mb-4">Tâches</h3>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3">
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="border-brand-turquoise data-[state=checked]:bg-brand-turquoise"
            />
            <label
              htmlFor={task.id}
              className={`flex-1 cursor-pointer text-sm ${
                task.completed
                  ? 'text-brand-gray line-through'
                  : 'text-brand-gray-dark'
              }`}
            >
              {task.title}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}
