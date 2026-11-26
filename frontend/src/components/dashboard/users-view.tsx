"use client"

import * as React from "react"
import { ListFilterIcon } from "lucide-react"

import { SearchField } from "@/components/dashboard/search-field"
import { UserDetailDrawer } from "@/components/dashboard/user-detail-drawer"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDateTime,
  planLabel,
  usersApi,
  type AdminUserListItem,
  type Role,
  type SubscriptionPlan,
  type UsersListParams,
} from "@/lib/api"

const PAGE_SIZE = 20

type FiltersState = {
  role: "all" | Role
  blocked: "all" | "yes" | "no"
  subscription: "all" | "active" | "none"
  plan: "all" | SubscriptionPlan
}

const emptyFilters: FiltersState = {
  role: "all",
  blocked: "all",
  subscription: "all",
  plan: "all",
}

function filtersToParams(filters: FiltersState): Partial<UsersListParams> {
  return {
    role: filters.role === "all" ? undefined : filters.role,
    blocked:
      filters.blocked === "all"
        ? undefined
        : filters.blocked === "yes",
    hasActiveSubscription:
      filters.subscription === "all"
        ? undefined
        : filters.subscription === "active",
    plan: filters.plan === "all" ? undefined : filters.plan,
  }
}

function activeFilterCount(filters: FiltersState) {
  let count = 0
  if (filters.role !== "all") count += 1
  if (filters.blocked !== "all") count += 1
  if (filters.subscription !== "all") count += 1
  if (filters.plan !== "all") count += 1
  return count
}

export function UsersView() {
  const [q, setQ] = React.useState("")
  const [appliedQ, setAppliedQ] = React.useState("")
  const [filters, setFilters] = React.useState<FiltersState>(emptyFilters)
  const [draftFilters, setDraftFilters] =
    React.useState<FiltersState>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [page, setPage] = React.useState(0)
  const [items, setItems] = React.useState<AdminUserListItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filterCount = activeFilterCount(filters)

  const loadList = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await usersApi.list({
        q: appliedQ || undefined,
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        ...filtersToParams(filters),
      })
      setItems(response.items)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки")
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [appliedQ, filters, page])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  function applySearch(next: string) {
    setPage(0)
    setAppliedQ(next)
  }

  function openFilters() {
    setDraftFilters(filters)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setFilters(draftFilters)
    setPage(0)
    setFiltersOpen(false)
  }

  function openUser(id: string) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  return (
    <>
      <SiteHeader
        title="Пользователи"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            onClick={openFilters}
          >
            <ListFilterIcon />
            Фильтры
            {filterCount > 0 ? (
              <Badge variant="secondary" className="ml-0.5">
                {filterCount}
              </Badge>
            ) : null}
          </Button>
        }
      />

      <Drawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Фильтры</DrawerTitle>
            <DrawerDescription>
              Роль, блокировка и подписка
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-2">
            <div className="grid gap-2">
              <Label>Роль</Label>
              <Select
                value={draftFilters.role}
                items={[
                  { value: "all", label: "Все" },
                  { value: "USER", label: "Пользователь" },
                  { value: "ADMIN", label: "Админ" },
                ]}
                onValueChange={(value) => {
                  if (value === "all" || value === "USER" || value === "ADMIN") {
                    setDraftFilters((prev) => ({ ...prev, role: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="USER">Пользователь</SelectItem>
                  <SelectItem value="ADMIN">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Статус</Label>
              <Select
                value={draftFilters.blocked}
                items={[
                  { value: "all", label: "Все" },
                  { value: "no", label: "Активные" },
                  { value: "yes", label: "Заблокированные" },
                ]}
                onValueChange={(value) => {
                  if (value === "all" || value === "yes" || value === "no") {
                    setDraftFilters((prev) => ({ ...prev, blocked: value }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="no">Активные</SelectItem>
                  <SelectItem value="yes">Заблокированные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Подписка</Label>
              <Select
                value={draftFilters.subscription}
                items={[
                  { value: "all", label: "Все" },
                  { value: "active", label: "Есть активная" },
                  { value: "none", label: "Без активной" },
                ]}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "active" ||
                    value === "none"
                  ) {
                    setDraftFilters((prev) => ({
                      ...prev,
                      subscription: value,
                      plan: value === "none" ? "all" : prev.plan,
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="active">Есть активная</SelectItem>
                  <SelectItem value="none">Без активной</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Тариф</Label>
              <Select
                value={draftFilters.plan}
                items={[
                  { value: "all", label: "Любой" },
                  { value: "MONTHLY", label: "Линия 30 дней" },
                  { value: "BANK_BOOST", label: "Буст банка" },
                ]}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "MONTHLY" ||
                    value === "BANK_BOOST"
                  ) {
                    setDraftFilters((prev) => ({
                      ...prev,
                      plan: value,
                      subscription:
                        value === "all" ? prev.subscription : "active",
                    }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любой</SelectItem>
                  <SelectItem value="MONTHLY">Линия 30 дней</SelectItem>
                  <SelectItem value="BANK_BOOST">Буст банка</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <Button type="button" className="w-full" onClick={applyFilters}>
              Применить
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setDraftFilters(emptyFilters)
              }}
            >
              Сбросить
            </Button>
            <DrawerClose
              render={
                <Button type="button" variant="outline" className="w-full" />
              }
            >
              Отмена
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
            <Button
              type="button"
              variant="outline"
              className="w-full md:hidden"
              onClick={openFilters}
            >
              <ListFilterIcon />
              Фильтры
              {filterCount > 0 ? (
                <Badge variant="secondary" className="ml-0.5">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>

            <SearchField
              value={q}
              onValueChange={setQ}
              onDebouncedChange={applySearch}
              placeholder="Имя или email"
            />

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : null}

            <div className="flex flex-col gap-2 md:hidden">
              {items.length === 0 && !loading ? (
                <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
                  Пользователи не найдены
                </p>
              ) : null}
              {items.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openUser(user.id)}
                  className="rounded-xl border bg-card/40 px-4 py-3 text-left transition-colors active:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{user.username}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {user.blockedAt ? (
                        <Badge variant="destructive">Блок</Badge>
                      ) : (
                        <Badge variant="secondary">Активен</Badge>
                      )}
                      {user.role === "ADMIN" ? (
                        <Badge variant="outline">Админ</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.activePlans.length ? (
                      user.activePlans.map((plan) => (
                        <Badge key={plan} variant="outline">
                          {planLabel(plan)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Без подписки
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Подписка</TableHead>
                    <TableHead>Активность</TableHead>
                    <TableHead>Регистрация</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Пользователи не найдены
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {items.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => openUser(user.id)}
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "ADMIN" ? "Админ" : "Пользователь"}
                      </TableCell>
                      <TableCell>
                        {user.blockedAt ? (
                          <Badge variant="destructive">Блок</Badge>
                        ) : (
                          <Badge variant="secondary">Активен</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.activePlans.length
                          ? user.activePlans.map(planLabel).join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.lastActivityAt
                          ? formatDateTime(user.lastActivityAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {total} · стр. {page + 1} / {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= pageCount || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Дальше
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UserDetailDrawer
        open={drawerOpen}
        userId={selectedId}
        onOpenChange={setDrawerOpen}
        onChanged={() => void loadList()}
      />
    </>
  )
}
