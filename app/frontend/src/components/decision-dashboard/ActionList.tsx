"use client";

import { CheckSquare, Square, ArrowRight, ExternalLink } from "lucide-react";
import { ActionTask } from "@/hooks/api/useDecisionDashboard";
import { Button } from "@/components/ui/button";

interface ActionListProps {
    tasks: ActionTask[];
    onTaskComplete?: (taskId: string) => void;
}

export function ActionList({ tasks, onTaskComplete }: ActionListProps) {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
                <CheckSquare className="h-8 w-8 mx-auto text-emerald-400 mb-2 opacity-50" />
                <p className="font-medium text-slate-700">Tudo em dia!</p>
                <p className="text-sm">Não há ações urgentes sugeridas pelo Radar de Decisões.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b px-5 py-4 flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {tasks.length}
                    </span>
                    O QUE FAZER HOJE
                </h3>
            </div>
            
            <ul className="divide-y divide-slate-100">
                {tasks.map((task) => (
                    <li key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group">
                        <button 
                            className="mt-0.5 text-slate-300 hover:text-blue-500 transition-colors flex-shrink-0"
                            onClick={() => onTaskComplete?.(task.id)}
                            title="Marcar como resolvido"
                        >
                            {task.completed ? <CheckSquare className="text-emerald-500" /> : <Square />}
                        </button>
                        
                        <div className="flex-1">
                            <p className={`font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {task.label}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    task.type === 'structural' 
                                        ? 'bg-rose-100 text-rose-700' 
                                        : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {task.type === 'structural' ? 'Hemorragia Base' : 'Alerta Recente'}
                                </span>
                            </div>
                        </div>

                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600">
                            Resolver <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
