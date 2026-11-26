"use client"

import type { ReactNode } from "react"
import { CircleHelpIcon } from "lucide-react"

import { FieldLabel } from "@/components/ui/field"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PASSWORD_HINT } from "@/lib/auth-errors"
import { cn } from "@/lib/utils"

export const PASSWORD_PLACEHOLDER = "••••••••"

function PasswordHintMark({
  triggerClassName,
}: {
  triggerClassName?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
              triggerClassName,
            )}
            aria-label="Требования к паролю"
          />
        }
      >
        <CircleHelpIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-balance">
        {PASSWORD_HINT}
      </TooltipContent>
    </Tooltip>
  )
}

export function PasswordFieldLabel({
  htmlFor,
  children,
  hint,
  trailing,
  labelClassName,
  hintTriggerClassName,
}: {
  htmlFor: string
  children: ReactNode
  hint?: boolean
  trailing?: ReactNode
  labelClassName?: string
  hintTriggerClassName?: string
}) {
  return (
    <div className="flex w-full items-center gap-1.5">
      <FieldLabel htmlFor={htmlFor} className={labelClassName}>
        {children}
      </FieldLabel>
      {hint ? (
        <PasswordHintMark triggerClassName={hintTriggerClassName} />
      ) : null}
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  )
}

type PasswordFieldProps = Omit<
  React.ComponentProps<typeof PasswordInput>,
  "id"
> & {
  id: string
  label: ReactNode
  hint?: boolean
  trailing?: ReactNode
  labelClassName?: string
  hintTriggerClassName?: string
  description?: ReactNode
}

export function PasswordField({
  id,
  label,
  hint,
  trailing,
  labelClassName,
  hintTriggerClassName,
  description,
  className,
  placeholder = PASSWORD_PLACEHOLDER,
  ...inputProps
}: PasswordFieldProps) {
  return (
    <div className="grid gap-2">
      <PasswordFieldLabel
        htmlFor={id}
        hint={hint}
        trailing={trailing}
        labelClassName={labelClassName}
        hintTriggerClassName={hintTriggerClassName}
      >
        {label}
      </PasswordFieldLabel>
      <PasswordInput
        id={id}
        placeholder={placeholder}
        className={className}
        {...inputProps}
      />
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
