import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DeleteOutline } from '../../../design-system/icons';
import { Button, Input, Modal, Segmented, Sheet, Textarea } from '../../../design-system/primitives';
import { useDataStore } from '../../../stores/useDataStore';
import { useAccess } from '../../../core/access/useAccess';
import { clearField } from '../../../services/firebaseService';
import { ClientProjectFields } from '../client-profile/details/ClientProjectFields';
import {
  EMPTY_PROJECT_FIELDS,
  buildProjectPatch,
  hasProjectDetails,
  projectFieldsOf,
  withProjectFields,
} from '../client-profile/details/clientFields';
import { focusFirstInvalid } from '../client-profile/details/focusInvalid';
import { clientSchema, type ClientFormValues } from '../client-profile/schemas';
import { canDeleteClient } from './clientAccess';
import type { Client } from '../../../types';

const EMPTY: ClientFormValues = { name: '', email: '', phone: '', address: '', type: 'individual', ...EMPTY_PROJECT_FIELDS };

interface ClientFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** `null` creates a new client, otherwise edits it. */
  client: Client | null;
  /** Called after a successful add or edit with the saved client. */
  onSaved?: (client: Client) => void;
}

/** Add / edit a client. Keeps what was typed when saving fails. */
export function ClientFormSheet({ open, onClose, client, onSaved }: ClientFormSheetProps) {
  const { addClient, updateClient, deleteClient } = useDataStore();
  const access = useAccess();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = !!client;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      client
        ? {
            name: client.name,
            email: client.email || '',
            phone: client.phone,
            address: client.address,
            type: client.type,
            ...projectFieldsOf(client),
          }
        : EMPTY
    );
  }, [open, client, reset]);

  const isCompany = watch('type') === 'company';

  const onSubmit = async (data: ClientFormValues) => {
    const basics = {
      name: data.name,
      email: data.email || '',
      phone: data.phone,
      address: data.address,
      type: data.type,
    };
    try {
      if (client) {
        await updateClient(client.id, { ...basics, ...buildProjectPatch(data, 'update', clearField) });
        onSaved?.(withProjectFields({ ...client, ...basics }, data));
      } else {
        const now = new Date().toISOString();
        const created: Client = {
          ...basics,
          ...buildProjectPatch(data, 'create', clearField),
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        await addClient(created);
        onSaved?.(created);
      }
      onClose();
    } catch {
      /* the store already showed the error; the sheet stays open with the typed values */
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      await deleteClient(client.id);
      setConfirmDelete(false);
      onClose();
    } catch {
      /* error toast comes from the store */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        mobile="bottom"
        maxWidth="sm"
        title={editing ? 'تعديل العميل' : 'عميل جديد'}
        subtitle={editing ? client?.name : 'الاسم ورقم الهاتف والعنوان'}
        footer={
          <Button type="submit" form="client-form" block loading={isSubmitting}>
            {editing ? 'حفظ التعديلات' : 'إضافة العميل'}
          </Button>
        }
      >
        <form id="client-form" onSubmit={handleSubmit(onSubmit, focusFirstInvalid)} noValidate className="space-y-5 p-4 lg:p-6">
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-fg-subtle">نوع العميل</span>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Segmented
                  aria-label="نوع العميل"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'individual', label: 'فرد' },
                    { value: 'company', label: 'شركة' },
                  ]}
                />
              )}
            />
          </div>

          <Input
            label={isCompany ? 'اسم الشركة' : 'اسم العميل'}
            placeholder={isCompany ? 'شركة النور للمقاولات' : 'محمد أحمد'}
            autoComplete="off"
            required
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="رقم الهاتف"
            placeholder="0912345678"
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="off"
            className="text-right"
            required
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="البريد الإلكتروني"
            hint="اختياري"
            placeholder="client@mail.com"
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="off"
            className="text-right"
            error={errors.email?.message}
            {...register('email')}
          />
          <Textarea
            label="العنوان"
            placeholder="المدينة، الحي، أقرب معلم"
            rows={2}
            required
            error={errors.address?.message}
            {...register('address')}
          />

          <ClientProjectFields control={control} collapsible defaultOpen={hasProjectDetails(projectFieldsOf(client))} />

          {editing && canDeleteClient(access.principal) && (
            <div className="border-t border-border pt-5">
              <Button
                variant="danger-soft"
                block
                leftIcon={<DeleteOutline sx={{ fontSize: 20 }} />}
                onClick={() => setConfirmDelete(true)}
              >
                حذف العميل
              </Button>
            </div>
          )}
        </form>
      </Sheet>

      <Modal
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        maxWidth="sm"
        title={`حذف «${client?.name ?? ''}»؟`}
        description="سيُحذف العميل نهائياً مع فواتيره ومدفوعاته ومصروفاته وديونه وعماله وبقية سجلاته. لا يمكن التراجع."
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            إلغاء
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            حذف نهائياً
          </Button>
        </div>
      </Modal>
    </>
  );
}
