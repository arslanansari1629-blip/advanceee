export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-2.5 w-28 rounded bg-raised" />
        <div className="h-6 w-64 rounded bg-raised" />
        <div className="h-3 w-[420px] max-w-full rounded bg-raised/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="panel h-[92px] p-4">
            <div className="h-2 w-16 rounded bg-raised" />
            <div className="mt-3 h-5 w-20 rounded bg-raised" />
            <div className="mt-3 h-2 w-24 rounded bg-raised/60" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="panel h-[380px] xl:col-span-2" />
        <div className="panel h-[380px]" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="panel h-[260px] xl:col-span-2" />
        <div className="panel h-[260px]" />
      </div>
    </div>
  );
}
