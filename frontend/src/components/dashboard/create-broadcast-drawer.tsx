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
  audienceLabel,
  MASS_AUDIENCE_SELECT_ITEMS,
  notificationsApi,
  type MassBroadcastAudience,
} from "@/lib/api"

export function CreateBroadcastDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}) {
  const isMobile = useIsMobile()
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [audience, setAudience] =
    React.useState<MassBroadcastAudience>("ACTIVE_SUBSCRIBERS")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setTitle("")
    setBody("")
    setAudience("ACTIVE_SUBSCRIBERS")
    setConfirmOpen(false)
    setSaving(false)
  }, [open])

  function requestSend(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.add({ title: "Заполните заголовок и текст", type: "error" })
      return
    }
    setConfirmOpen(true)
  }

  async function sendBroadcast() {
    setSaving(true)
    try {
      await notificationsApi.createBroadcast({
        title: title.trim(),
        body: body.trim(),
        audience,
      })
      toast.add({ title: "Рассылка отправлена", type: "success" })
      setConfirmOpen(false)
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Ошибка отправки",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        showSwipeHandle={isMobile}
        swipeDirection={isMobile ? "down" : "right"}
      >
        <DrawerContent className="flex max-h-[92dvh] min-h-0 flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle>Новая рассылка</DrawerTitle>
            <DrawerDescription>
              Сообщение уйдёт выбранной аудитории по доступным каналам
            </DrawerDescription>
          </DrawerHeader>

          <form
            id="create-broadcast-form"
            onSubmit={requestSend}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2"
          >
            <div className="grid gap-2">
              <Label htmlFor="broadcast-title">Заголовок</Label>
              <Input
                id="broadcast-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="broadcast-body">Текст</Label>
              <Textarea
                id="broadcast-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                className="min-h-32"
              />
            </div>
            <div className="grid gap-2">
              <Label>Аудитория</Label>
              <Select
                value={audience}
                items={MASS_AUDIENCE_SELECT_ITEMS}
                onValueChange={(value) => {
                  if (
                    value === "ACTIVE_SUBSCRIBERS" ||
                    value === "EMAIL_OPTED_IN" ||
                    value === "TELEGRAM_OPTED_IN"
                  ) {
                    setAudience(value)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MASS_AUDIENCE_SELECT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>

          <DrawerFooter>
            <Button type="submit" form="create-broadcast-form" disabled={saving}>
              Отправить
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next && !saving) setConfirmOpen(false)
        }}
      >
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Отправить рассылку?</AlertDialogTitle>
            <AlertDialogDescription>
              «{title.trim() || "Без заголовка"}» уйдёт аудитории «
              {audienceLabel(audience)}». Отмену после отправки сделать нельзя.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => void sendBroadcast()}
            >
              {saving ? "Отправка…" : "Отправить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
