import { useMemo, useState } from "react";
import { Check, Search, Star, StarBorder, ExpandMore } from '../../design-system/icons';
import {
  Button,
  IconButton,
  Input,
  Sheet,
} from "../../design-system/primitives";
import {
  CONSTRUCTION_EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
  getExpenseCategoryLabel,
} from "../../core/expenseCategories";
import { matchesQuery } from "./quickExpenseLogic";

interface CategoryChoiceProps {
  value: string;
  onChange: (key: string) => void;
  favorites: string[];
  onToggleFavorite: (key: string) => void;
}

/** One explicit selector opens every construction category, grouped and searchable. */
export function CategoryChoice({
  value,
  onChange,
  favorites,
  onToggleFavorite,
}: CategoryChoiceProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () =>
      EXPENSE_CATEGORY_GROUPS.map((group) => ({
        ...group,
        categories: CONSTRUCTION_EXPENSE_CATEGORIES.filter(
          (category) =>
            category.group === group.id &&
            matchesQuery(
              query,
              category.label,
              category.shortLabel,
              category.keywords,
              group.label,
            ),
        ),
      })).filter((group) => group.categories.length),
    [query],
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          aria-haspopup="dialog" aria-expanded={open}
          aria-label={`اختيار فئة المصروف: ${getExpenseCategoryLabel(value)}`}
          rightIcon={<ExpandMore aria-hidden sx={{ fontSize: 20 }} />}
          className="min-h-14 min-w-0 flex-1 text-start [&>span]:flex-1 [&>span]:justify-start"
          onClick={() => {
            setQuery("");
            setOpen(true);
          }}
        >
          <span className="min-w-0 text-start">
            <span className="block break-words font-semibold">{getExpenseCategoryLabel(value)}</span>
            <span className="mt-0.5 block text-xs font-normal text-fg-muted">كل الفئات ({CONSTRUCTION_EXPENSE_CATEGORIES.length})، بحث واختيار</span>
          </span>
        </Button>
        <IconButton
          label={
            favorites.includes(value)
              ? "إزالة الفئة من المفضلة"
              : "تثبيت الفئة في المفضلة"
          }
          onClick={() => onToggleFavorite(value)}
        >
          {favorites.includes(value) ? (
            <Star className="text-accent-ink" />
          ) : (
            <StarBorder />
          )}
        </IconButton>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        mobile="bottom"
        maxWidth="md"
        title="فئات مصروفات البناء"
        subtitle="اختر الفئة، أو ثبّت المعتاد منها في المفضلة"
        headerExtras={
          <Input
            type="search"
            inputMode="search"
            aria-label="بحث في فئات المصروفات"
            placeholder="مثل أسمنت، كابلات، حفر، سلامة"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leftIcon={<Search aria-hidden sx={{ fontSize: 20 }} />}
          />
        }
      >
        <div className="space-y-6 px-4 py-4 lg:px-6">
          {groups.length === 0 && (
            <p className="py-10 text-center text-sm text-fg-subtle">
              لا توجد فئة مطابقة. جرّب اسم المادة أو نوع العمل.
            </p>
          )}
          {groups.map((group) => (
            <section
              key={group.id}
              className="space-y-2"
              aria-label={group.label}
            >
              <h3 className="text-sm font-semibold text-fg-subtle">
                {group.label}
              </h3>
              <div className="divide-y divide-border rounded-lg border border-border">
                {group.categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-1 px-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChange(category.id);
                        setOpen(false);
                      }}
                      aria-current={category.id === value ? "true" : undefined}
                      className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-3 text-start text-sm font-semibold text-fg hover:bg-surface-hover focus-visible:shadow-focus"
                    >
                      <span className="min-w-0 flex-1">{category.label}</span>
                      {category.id === value && (
                        <Check
                          aria-hidden
                          className="shrink-0 text-accent-ink"
                          sx={{ fontSize: 20 }}
                        />
                      )}
                    </button>
                    <IconButton
                      label={`${favorites.includes(category.id) ? "إزالة" : "تثبيت"} ${category.shortLabel} ${favorites.includes(category.id) ? "من" : "في"} المفضلة`}
                      onClick={() => onToggleFavorite(category.id)}
                    >
                      {favorites.includes(category.id) ? (
                        <Star
                          className="text-accent-ink"
                          sx={{ fontSize: 22 }}
                        />
                      ) : (
                        <StarBorder sx={{ fontSize: 22 }} />
                      )}
                    </IconButton>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
