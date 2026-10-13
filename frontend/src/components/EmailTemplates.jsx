import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Mail, Code, Eye, MonitorPlay, X } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../services/api';

export default function EmailTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'
    const [showPreview, setShowPreview] = useState(false);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ]
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/email/templates');
            setTemplates(res.data || []);
            if (res.data?.length > 0) setSelectedTemplateId(res.data[0].id);
        } catch (error) {
            toast.error('Failed to load email templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        if (!selectedTemplate) return;

        setSaving(true);
        try {
            await api.put(`/email/templates/${selectedTemplate.id}`, {
                subject: selectedTemplate.subject,
                body: selectedTemplate.body
            });
            toast.success('Template saved successfully');
        } catch (error) {
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-gray-500">Loading templates...</div>;

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="space-y-6 w-full">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Templates</h2>
                <p className="text-sm text-gray-500 mt-1">Customize the default emails sent to users.</p>
            </div>

            {templates.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 text-center text-gray-500">
                    No templates generated yet. They will be created automatically when the system tries to send them for the first time.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="col-span-1 space-y-2">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplateId(template.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                                    selectedTemplateId === template.id
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium border border-indigo-200 dark:border-indigo-800/30'
                                        : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <span className="capitalize">{template.type.replace(/_/g, ' ')}</span>
                            </button>
                        ))}
                    </div>

                    <div className="col-span-1 md:col-span-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
                        {selectedTemplate && (
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">Subject</label>
                                    <input
                                        type="text"
                                        value={selectedTemplate.subject}
                                        onChange={(e) => {
                                            const updated = templates.map(t => t.id === selectedTemplate.id ? { ...t, subject: e.target.value } : t);
                                            setTemplates(updated);
                                        }}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-300">Email Body</label>
                                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setEditorMode('visual')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${editorMode === 'visual'
                                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <Eye size={14} /> Visual
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditorMode('html')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${editorMode === 'html'
                                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <Code size={14} /> HTML
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl overflow-hidden border border-gray-300 dark:border-slate-700">
                                        {editorMode === 'visual' ? (
                                            <div className="text-black bg-white">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={selectedTemplate.body}
                                                    onChange={newContent => {
                                                        const updated = templates.map(t => t.id === selectedTemplate.id ? { ...t, body: newContent } : t);
                                                        setTemplates(updated);
                                                    }}
                                                    modules={quillModules}
                                                    className="h-[350px] overflow-hidden rounded-md border-0"
                                                />
                                            </div>
                                        ) : (
                                            <textarea
                                                value={selectedTemplate.body}
                                                onChange={(e) => {
                                                    const updated = templates.map(t => t.id === selectedTemplate.id ? { ...t, body: e.target.value } : t);
                                                    setTemplates(updated);
                                                }}
                                                className="w-full h-[348px] px-4 py-3 font-mono text-sm bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-300 focus:outline-none resize-none"
                                            />
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        You can use variables like {'{{userName}}'}, {'{{companyName}}'}, {'{{planName}}'}, {'{{loginUrl}}'}, {'{{password}}'}, {'{{amount}}'}, etc. depending on the template type.
                                    </p>
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium transition-all"
                                    >
                                        <MonitorPlay size={18} />
                                        Preview
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                        {saving ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && selectedTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#f2f6fc] dark:bg-slate-950 rounded-lg w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Gmail-style Header */}
                        <div className="px-6 py-4 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                    W
                                </div>
                                <div>
                                    <h3 className="text-xl font-normal text-gray-900 dark:text-white mb-1">
                                        {selectedTemplate.subject}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="font-bold text-gray-900 dark:text-white">Wcrm</span>
                                        <span className="text-gray-500">&lt;noreply@wcrm.com&gt;</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        to me ▾
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start h-full pt-1">
                                <span className="text-xs text-gray-500 mr-4 mt-1">{new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Email Body Container - White Background exactly like Inbox */}
                        <div className="p-0 overflow-y-auto flex-grow bg-white dark:bg-white text-black m-6 rounded-md shadow-sm border border-gray-200">
                            <div className="p-8 max-w-[800px] mx-auto text-base" 
                                 dangerouslySetInnerHTML={{ __html: selectedTemplate.body }}
                                 style={{ minHeight: '400px', fontFamily: 'Arial, sans-serif' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
