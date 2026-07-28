"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckboxGroup } from "@/components/ui/checkbox-group"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

const FRUITS = ["apple", "banana", "cherry"]
const PERMISSIONS = ["read", "write", "delete"]

function SelectAllExample() {
  const [value, setValue] = React.useState<string[]>(["read"])
  const allChecked = value.length === PERMISSIONS.length
  const someChecked = value.length > 0 && !allChecked

  return (
    <CheckboxGroup
      value={value}
      onValueChange={setValue}
      allValues={PERMISSIONS}
    >
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Checkbox
          size="sm"
          checked={allChecked}
          indeterminate={someChecked}
          onCheckedChange={(checked) =>
            setValue(checked ? PERMISSIONS : [])
          }
        />
        Select all permissions
      </label>
      <div className="ml-6 flex flex-col gap-2">
        {PERMISSIONS.map((permission) => (
          <label
            key={permission}
            className="flex items-center gap-2 text-sm text-secondary-foreground capitalize"
          >
            <Checkbox name={permission} size="sm" />
            {permission}
          </label>
        ))}
      </div>
    </CheckboxGroup>
  )
}

export default function CheckboxGroupPage() {
  const [value, setValue] = React.useState<string[]>(["apple"])

  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Default */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Default</SectionTitle>
        <CheckboxGroup defaultValue={["banana"]}>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="apple" size="sm" />
            Apple
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="banana" size="sm" />
            Banana
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="cherry" size="sm" />
            Cherry
          </label>
        </CheckboxGroup>
      </div>

      {/* Controlled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Controlled</SectionTitle>
        <CheckboxGroup value={value} onValueChange={setValue}>
          {FRUITS.map((fruit) => (
            <label
              key={fruit}
              className="flex items-center gap-2 text-sm text-secondary-foreground capitalize"
            >
              <Checkbox name={fruit} size="sm" />
              {fruit}
            </label>
          ))}
        </CheckboxGroup>
        <p className="text-sm text-muted-foreground">
          Selected: {value.length > 0 ? value.join(", ") : "none"}
        </p>
      </div>

      {/* Disabled */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled</SectionTitle>
        <CheckboxGroup disabled defaultValue={["banana"]}>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="apple" size="sm" />
            Apple
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="banana" size="sm" />
            Banana
          </label>
        </CheckboxGroup>
      </div>

      {/* Disabled item */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Disabled item</SectionTitle>
        <CheckboxGroup defaultValue={["apple"]}>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="apple" size="sm" />
            Apple
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground opacity-50">
            <Checkbox name="banana" size="sm" disabled />
            Banana (out of stock)
          </label>
          <label className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Checkbox name="cherry" size="sm" />
            Cherry
          </label>
        </CheckboxGroup>
      </div>

      {/* Select all */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Select all</SectionTitle>
        <SelectAllExample />
      </div>

      {/* With descriptions */}
      <div className="flex max-w-sm flex-col gap-4">
        <SectionTitle>With descriptions</SectionTitle>
        <CheckboxGroup defaultValue={["email"]}>
          <Field orientation="vertical">
            <FieldLabel htmlFor="notify-email">
              <Checkbox id="notify-email" name="email" size="sm" />
              <FieldContent>
                <FieldTitle>Email</FieldTitle>
                <FieldDescription>
                  Get notified when someone comments.
                </FieldDescription>
              </FieldContent>
            </FieldLabel>
          </Field>
          <Field orientation="vertical">
            <FieldLabel htmlFor="notify-sms">
              <Checkbox id="notify-sms" name="sms" size="sm" />
              <FieldContent>
                <FieldTitle>SMS</FieldTitle>
                <FieldDescription>
                  Get texted for time-sensitive alerts.
                </FieldDescription>
              </FieldContent>
            </FieldLabel>
          </Field>
          <Field orientation="vertical">
            <FieldLabel htmlFor="notify-push">
              <Checkbox id="notify-push" name="push" size="sm" />
              <FieldContent>
                <FieldTitle>Push</FieldTitle>
                <FieldDescription>
                  Get push notifications on your devices.
                </FieldDescription>
              </FieldContent>
            </FieldLabel>
          </Field>
        </CheckboxGroup>
      </div>
    </div>
  )
}
