export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        <div className="h-44 rounded-xl bg-gray-100" />
        <div className="col-span-3 grid grid-cols-3 gap-3">
          <div className="h-44 rounded-xl bg-gray-100" />
          <div className="h-44 rounded-xl bg-gray-100" />
          <div className="h-44 rounded-xl bg-gray-100" />
        </div>
      </div>
      <div className="h-48 rounded-xl bg-gray-100" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}
