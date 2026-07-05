import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EXPERIENCE_TYPES } from '../i18n';

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'PROJECT', title: '', description: '', role: '', result: '' });

  const { data: experiences = [], isLoading } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });

  const createMutation = useMutation({
    mutationFn: api.createExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setShowForm(false);
      setForm({ type: 'PROJECT', title: '', description: '', role: '', result: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExperience,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiences'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('experiences.title')}</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          {showForm ? t('common.cancel') : t('experiences.add')}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
          className="bg-white dark:bg-gray-900 border rounded-xl p-6 mb-6 space-y-3"
        >
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800">
            {EXPERIENCE_TYPES.map((type) => (
              <option key={type} value={type}>{t(`experienceType.${type}`)}</option>
            ))}
          </select>
          <input placeholder={t('experiences.titlePlaceholder')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <textarea placeholder={t('experiences.descriptionPlaceholder')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" rows={3} />
          <input placeholder={t('experiences.rolePlaceholder')} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
          <input placeholder={t('experiences.resultPlaceholder')} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">{t('common.save')}</button>
        </form>
      )}

      {isLoading ? <p>{t('common.loading')}</p> : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div key={exp.id} className="bg-white dark:bg-gray-900 border rounded-xl p-5 flex justify-between">
              <div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {t(`experienceType.${exp.type}`, { defaultValue: exp.type })}
                </span>
                <h3 className="font-semibold mt-1">{exp.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{exp.description}</p>
                {exp.result && <p className="text-sm mt-2 text-green-700">{t('experiences.resultLabel')}: {exp.result}</p>}
              </div>
              <button onClick={() => deleteMutation.mutate(exp.id)} className="text-red-500 text-sm self-start">{t('common.delete')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
