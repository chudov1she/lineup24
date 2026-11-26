"use client"

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
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  audienceLabel,
  formatDateTime,
  type Broadcast,
} from "@/lib/api"

export function BroadcastDetailDrawer({
  open,
  broadcast,
  onOpenChange,
}: {
  open: boolean
  broadcast: Broadcast | null
  onOpenChange: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const isDirect = broadcast?.audience === "DIRECT_USER"

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent className="flex max-h-[92dvh] min-h-0 flex-col">
        {broadcast ? (
          <>
            <DrawerHeader className="text-left">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <DrawerTitle>{broadcast.title}</DrawerTitle>
                <Badge variant={isDirect ? "default" : "secondary"}>
                  {audienceLabel(broadcast.audience)}
                </Badge>
              </div>
              <DrawerDescription>
                {formatDateTime(broadcast.createdAt)} · отправлено{" "}
                {broadcast.sentCount}
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">Тип</p>
                    <p className="mt-1 font-medium">
                      {isDirect ? "Личное" : "Массовая"}
                    </p>
                  </div>
                  <div className="rounded-xl border px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">Получатель</p>
                    <p className="mt-1 font-medium">
                      {broadcast.recipient
                        ? broadcast.recipient.username
                        : "Аудитория"}
                    </p>
                  </div>
                </div>

                {broadcast.recipient ? (
                  <div className="rounded-xl border px-3.5 py-3 text-sm">
                    <p className="font-medium">{broadcast.recipient.username}</p>
                    <p className="text-muted-foreground">
                      {broadcast.recipient.email}
                    </p>
                  </div>
                ) : null}

                <Separator />

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Текст</p>
                  <div className="rounded-xl border bg-card/50 px-3.5 py-3">
                    <p className="text-sm leading-relaxed text-pretty whitespace-pre-wrap text-muted-foreground">
                      {broadcast.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DrawerFooter>
              <DrawerClose
                render={<Button type="button" variant="outline" />}
              >
                Закрыть
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
