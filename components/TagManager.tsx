import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Search, Trash2, Tag as TagIcon, Check } from 'lucide-react';
import { Tag } from '../lib/contacts';

interface TagManagerProps {
    selectedTags: string[];
    availableTags: Tag[];
    onAddTag: (tagName: string) => void;
    onRemoveTag: (tagName: string) => void;
    onCreateTag: (tagName: string, color: string) => Promise<void>;
    onDeleteSystemTag: (tagId: string) => Promise<void>;
}

const COLORS = [
    { name: 'blue', class: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', dot: 'bg-blue-500' },
    { name: 'green', class: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', dot: 'bg-green-500' },
    { name: 'red', class: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800', dot: 'bg-red-500' },
    { name: 'yellow', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800', dot: 'bg-yellow-500' },
    { name: 'purple', class: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', dot: 'bg-purple-500' },
    { name: 'pink', class: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800', dot: 'bg-pink-500' },
    { name: 'indigo', class: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800', dot: 'bg-indigo-500' },
    { name: 'gray', class: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', dot: 'bg-gray-500' },
];

export const TagManager: React.FC<TagManagerProps> = ({
    selectedTags,
    availableTags,
    onAddTag,
    onRemoveTag,
    onCreateTag,
    onDeleteSystemTag
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedColor, setSelectedColor] = useState('blue');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const getTagColorClass = (colorName: string) => {
        return COLORS.find(c => c.name === colorName)?.class || COLORS.find(c => c.name === 'gray')?.class;
    };

    const getTagColorFromList = (tagName: string) => {
        const tag = availableTags.find(t => t.name === tagName);
        return tag ? getTagColorClass(tag.color) : getTagColorClass('gray');
    };

    const filteredTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedTags.includes(tag.name)
    );

    const handleCreate = async () => {
        if (!searchTerm.trim()) return;
        await onCreateTag(searchTerm.trim(), selectedColor);
        setSearchTerm('');
        // Keep open to allow adding more or see result? 
        // Maybe close for cleaner interaction
        // setIsOpen(false); 
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagName) => (
                    <span
                        key={tagName}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-sm ${getTagColorFromList(tagName)}`}
                    >
                        {tagName}
                        <button
                            onClick={() => onRemoveTag(tagName)}
                            className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 dark:bg-card-dark dark:text-gray-400 dark:border-border-dark dark:hover:bg-muted-dark dark:hover:text-gray-200 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                    </button>

                    {isOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1A1D21] rounded-xl shadow-xl border border-gray-200 dark:border-border-dark z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 border-b border-gray-100 dark:border-border-dark">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Buscar ou criar tag..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white placeholder-gray-400"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredTags.length > 0 && filteredTags[0].name.toLowerCase() === searchTerm.toLowerCase()) {
                                                    onAddTag(filteredTags[0].name);
                                                    setSearchTerm('');
                                                } else {
                                                    handleCreate();
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {searchTerm && !availableTags.some(t => t.name.toLowerCase() === searchTerm.toLowerCase()) && (
                                <div className="p-3 bg-gray-50 dark:bg-black/10 border-b border-gray-100 dark:border-border-dark">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Cor da nova tag:</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLORS.map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() => setSelectedColor(color.name)}
                                                className={`w-6 h-6 rounded-full ${color.dot} transition-transform hover:scale-110 flex items-center justify-center ring-2 ring-offset-2 dark:ring-offset-card-dark ${selectedColor === color.name ? 'ring-gray-400 dark:ring-gray-500 scale-110' : 'ring-transparent'}`}
                                            >
                                                {selectedColor === color.name && <Check className="w-3 h-3 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleCreate}
                                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Criar tag "{searchTerm}"
                                    </button>
                                </div>
                            )}

                            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                {filteredTags.length === 0 && !searchTerm && (
                                    <p className="text-xs text-gray-400 text-center py-4">
                                        Nenhuma tag disponível.<br />Digite para criar.
                                    </p>
                                )}

                                {filteredTags.map((tag) => (
                                    <div
                                        key={tag.id}
                                        className="group flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <div
                                            className="flex items-center gap-2 flex-1"
                                            onClick={() => {
                                                onAddTag(tag.name);
                                                setSearchTerm('');
                                            }}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${COLORS.find(c => c.name === tag.color)?.dot || 'bg-gray-400'}`} />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSystemTag(tag.id);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title="Excluir do sistema"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}

                                {/* Show already selected tags but disabled/faded? Or just hide them (already hidden by filter) */}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
