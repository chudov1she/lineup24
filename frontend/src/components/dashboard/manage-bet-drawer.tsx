"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  BET_RESULT_SELECT_ITEMS,
  betsApi,
  resultLabel,
  type Bet,
  type BetResult,
} from "@/lib/api"

type Mode = "create" | "edit"

export function ManageBetDrawer({
  open,
  mode,
  bet,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  mode: Mode
  bet: Bet | null
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const isMobile = useIsMobile()
  const [title, setTitle] = React.useState("")
  const [forecast, setForecast] = React.useState("")
  const [odds, setOdds] = React.useState("1.85")
  const [score, setScore] = React.useState("")
  const [comment, setComment] = React.useState("")
  const [result, setResult] = React.useState<BetResult>("PENDING")
  const [saving, setSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setDeleteOpen(false)
    if (mode === "edit" && bet) {
      setTitle(bet.title)
      setForecast(bet.forecast)
      setOdds(String(bet.odds))
      setScore(bet.score ?? "")
      setComment(bet.comment ?? "")
      setResult(bet.result)
      return
    }
    setTitle("")
    setForecast("")
    setOdds("1.85")
    setScore("")
    setComment("")
    setResult("PENDING")
  }, [open, mode, bet])

  function closeDrawer(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setDeleteOpen(false)
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const oddsValue = Number(odds)
    if (!Number.isFinite(oddsValue) || oddsValue < 1) {
      toast.add({ title: "Укажите корректный коэффициент", type: "error" })
      return
    }

    setSaving(true)
    try {
      if (mode === "edit" && bet) {
        await betsApi.update(bet.id, {
          title: title.trim(),
          forecast: forecast.trim(),
          odds: oddsValue,
          score: score.trim() || null,
          comment: comment.trim() || null,
          result,
        })
        toast.add({ title: "Ставка обновлена", type: "success" })
      } else {
        await betsApi.create({
          title: title.trim(),
          forecast: forecast.trim(),
          odds: oddsValue,
          score: score.trim() || undefined,
          comment: comment.trim() || undefined,
          result,
        })
        toast.add({ title: "Сигнал создан", type: "success" })
      }
      onOpenChange(false)
      onChanged()
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Ошибка сохранения",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!bet) return
    setDeleting(true)
    try {
      await betsApi.remove(bet.id)
      toast.add({ title: "Ставка удалена", type: "success" })
      setDeleteOpen(false)
      onOpenChange(false)
      onChanged()
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Ошибка удаления",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={closeDrawer}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent className="flex max-h-[92dvh] min-h-0 flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {mode === "edit" ? "Редактирование" : "Новый сигнал"}
            </DrawerTitle>
            <DrawerDescription>
              {mode === "edit"
                ? bet?.title ?? "Изменение ставки"
                : "Опубликуйте прогноз для подписчиков"}
            </DrawerDescription>
          </DrawerHeader>

          <form
            id="manage-bet-form"
            onSubmit={(event) => void onSubmit(event)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2"
          >
            <div className="grid gap-2">
              <Label htmlFor="manage-bet-title">Матч / заголовок</Label>
              <Input
                id="manage-bet-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="ЦСКА — Спартак"
                required
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="manage-bet-forecast">Прогноз</Label>
                <Input
                  id="manage-bet-forecast"
                  value={forecast}
                  onChange={(event) => setForecast(event.target.value)}
                  placeholder="ТБ 2.5"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manage-bet-odds">Коэффициент</Label>
                <Input
                  id="manage-bet-odds"
                  type="number"
                  step="0.001"
                  min="1"
                  value={odds}
                  onChange={(event) => setOdds(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="manage-bet-score">Счёт</Label>
                <Input
                  id="manage-bet-score"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  placeholder="2:1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Исход</Label>
                <Select
                  value={result}
                  items={BET_RESULT_SELECT_ITEMS}
                  onValueChange={(value) => {
                    if (
                      value === "PENDING" ||
                      value === "WON" ||
                      value === "LOST"
                    ) {
                      setResult(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BET_RESULT_SELECT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="manage-bet-comment">Комментарий</Label>
              <Textarea
                id="manage-bet-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Короткий разбор линии…"
                className="min-h-28"
              />
            </div>
          </form>

          <DrawerFooter className="gap-2">
            <Button
              type="submit"
              form="manage-bet-form"
              disabled={saving || deleting}
            >
              {saving
                ? "Сохранение…"
                : mode === "edit"
                  ? "Сохранить"
                  : "Создать сигнал"}
            </Button>
            {mode === "edit" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                Удалить
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={saving || deleting}
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next && !deleting) setDeleteOpen(false)
        }}
      >
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить ставку?</AlertDialogTitle>
            <AlertDialogDescription>
              «{bet?.title ?? "Ставка"}» будет удалена без возможности
              восстановления. Текущий исход:{" "}
              {bet ? resultLabel(bet.result) : "—"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => void onDelete()}
            >
              {deleting ? "Удаление…" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
