type StageFormPlaceholderProps = {
  title: string;
};

export function StageFormPlaceholder({ title }: StageFormPlaceholderProps) {
  return (
    <form className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <fieldset disabled>
        <legend className="text-sm font-semibold text-slate-700">{title}</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-500">
            Reference
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="Future workflow field"
            />
          </label>
          <label className="text-sm text-slate-500">
            Status
            <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option>Placeholder</option>
            </select>
          </label>
        </div>
      </fieldset>
    </form>
  );
}
