import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

interface AbsenceReason {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export default function Settings() {
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false)
  const [editingReason, setEditingReason] = useState<AbsenceReason | null>(null)
  const [reasonForm, setReasonForm] = useState<Omit<AbsenceReason, 'id' | 'created_at'>>({
    name: '',
    code: '',
    is_active: true,
  })

  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, any>>('/api/settings'),
  })

  const { data: absenceReasons } = useQuery({
    queryKey: ['absence-reasons'],
    queryFn: () => api.get<AbsenceReason[]>('/api/attendance/reasons/all'),
  })

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return api.put(`/api/settings/${key}`, { value, type: 'string' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const createReasonMutation = useMutation({
    mutationFn: async (reason: Omit<AbsenceReason, 'id' | 'created_at'>) => {
      return api.post<AbsenceReason>('/api/attendance/reasons', reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-reasons'] })
      setIsReasonModalOpen(false)
    },
  })

  const updateReasonMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: Partial<AbsenceReason> }) => {
      return api.put<AbsenceReason>(`/api/attendance/reasons/${id}`, reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-reasons'] })
      setIsReasonModalOpen(false)
    },
  })

  const groupName = settings?.group_name || ''
  const timezone = settings?.timezone || ''

  const handleOpenReasonModal = (reason?: AbsenceReason) => {
    if (reason) {
      setEditingReason(reason)
      setReasonForm({
        name: reason.name,
        code: reason.code,
        is_active: reason.is_active,
      })
    } else {
      setEditingReason(null)
      setReasonForm({
        name: '',
        code: '',
        is_active: true,
      })
    }
    setIsReasonModalOpen(true)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Настройки</h1>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Общие настройки</h2>
        <div className="space-y-4">
          <Input
            label="Название группы"
            value={groupName}
            onChange={(e) =>
              updateSettingMutation.mutateAsync({ key: 'group_name', value: e.target.value })
            }
          />
          <Input
            label="Часовой пояс"
            value={timezone}
            onChange={(e) =>
              updateSettingMutation.mutateAsync({ key: 'timezone', value: e.target.value })
            }
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Причины отсутствия</h2>
          <Button onClick={() => handleOpenReasonModal()}>Добавить причину</Button>
        </div>
        {absenceReasons && absenceReasons.length > 0 ? (
          <div className="space-y-2">
            {absenceReasons.map((reason) => (
              <div
                key={reason.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{reason.name}</span>
                  <span className="text-sm text-gray-500 ml-2">({reason.code})</span>
                  {!reason.is_active && (
                    <span className="ml-2 text-xs text-gray-400">(неактивна)</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenReasonModal(reason)}
                  className="text-sm"
                >
                  Редактировать
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Нет причин отсутствия</p>
        )}
      </Card>

      <Modal
        isOpen={isReasonModalOpen}
        onClose={() => setIsReasonModalOpen(false)}
        title={editingReason ? 'Редактировать причину' : 'Добавить причину'}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (editingReason) {
              await updateReasonMutation.mutateAsync({
                id: editingReason.id,
                reason: reasonForm,
              })
            } else {
              await createReasonMutation.mutateAsync(reasonForm)
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Название"
            value={reasonForm.name}
            onChange={(e) => setReasonForm({ ...reasonForm, name: e.target.value })}
            required
          />
          <Input
            label="Код"
            value={reasonForm.code}
            onChange={(e) => setReasonForm({ ...reasonForm, code: e.target.value })}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={reasonForm.is_active}
              onChange={(e) => setReasonForm({ ...reasonForm, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Активна
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsReasonModalOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createReasonMutation.isPending || updateReasonMutation.isPending}
            >
              {createReasonMutation.isPending || updateReasonMutation.isPending
                ? 'Сохранение...'
                : editingReason
                ? 'Сохранить'
                : 'Добавить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
