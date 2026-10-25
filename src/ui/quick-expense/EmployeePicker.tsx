import { useMemo, useState } from 'react';
import { Search } from '@mui/icons-material';
import { Avatar, Input } from '../../design-system/primitives';
import { ChipGroup } from './Chips';
import { matchesQuery, PEOPLE_SEARCH_THRESHOLD, type Person } from './quickExpenseLogic';

interface EmployeePickerProps {
  me: Person;
  people: Person[];
  /** The person the expense is for. */
  value: string;
  onChange: (id: string) => void;
}

const ME = 'أنا';

/**
 * "لمن هذا المصروف؟": shown only to people who may record for someone else (edit-all and the users
 * directory). "أنا" first, then the others; a search box appears when the list is long. Choosing
 * someone makes the expense theirs: their custody pays for it and it shows in their own list.
 */
export function EmployeePicker({ me, people, value, onChange }: EmployeePickerProps) {
  const [query, setQuery] = useState('');
  const searchable = people.length > PEOPLE_SEARCH_THRESHOLD;

  const { visible, noMatch } = useMemo(() => {
    const hits = searchable && query.trim() ? people.filter((p) => matchesQuery(query, p.name)) : people;
    // The chosen person stays in the row even when the search no longer matches them.
    const chosen = people.find((p) => p.id === value);
    return { visible: chosen && !hits.includes(chosen) ? [chosen, ...hits] : hits, noMatch: hits.length === 0 };
  }, [people, query, searchable, value]);

  const options = [
    { value: me.id, label: ME, name: ME, leading: <Avatar name={me.name} size="sm" /> },
    ...visible.map((p) => ({
      value: p.id,
      label: p.name,
      name: p.name,
      leading: <Avatar name={p.name} size="sm" />,
    })),
  ];

  return (
    <div className="space-y-2">
      {searchable && (
        <Input
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label="بحث عن موظف"
          placeholder="ابحث عن موظف"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search aria-hidden sx={{ fontSize: 22 }} />}
        />
      )}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
        <ChipGroup
          label="لمن هذا المصروف"
          value={value}
          onChange={onChange}
          nowrap
          className="flex shrink-0 gap-2 lg:min-w-0 lg:shrink lg:flex-wrap"
          chipClassName="max-w-[14rem] !ps-1.5 min-h-12"
          options={options}
        />
      </div>
      {searchable && query.trim() && noMatch && (
        <p className="px-1 text-sm text-fg-subtle">لا يوجد موظف بهذا الاسم.</p>
      )}
    </div>
  );
}
