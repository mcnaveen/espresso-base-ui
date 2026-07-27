"use client"

import * as React from "react"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

function BasicForm() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState<string | null>(null)

  return (
    <Form
      className="max-w-sm"
      onFormSubmit={(values) => {
        const nextErrors: Record<string, string> = {}
        if (!values.email) {
          nextErrors.email = "Email is required."
        }
        if (!values.username) {
          nextErrors.username = "Username is required."
        }
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length === 0) {
          setSubmitted(JSON.stringify(values))
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="form-username">Username</FieldLabel>
          <Input id="form-username" name="username" />
          <FieldError errors={[{ message: errors.username }]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="form-email">Email</FieldLabel>
          <Input id="form-email" name="email" type="email" />
          <FieldDescription>
            We&apos;ll never share your email.
          </FieldDescription>
          <FieldError errors={[{ message: errors.email }]} />
        </Field>
      </FieldGroup>
      <Button type="submit" className="mt-6 w-fit">
        Submit
      </Button>
      {submitted && (
        <p className="mt-3 text-sm text-muted-foreground">
          Submitted: {submitted}
        </p>
      )}
    </Form>
  )
}

export default function FormPage() {
  return (
    <div className="flex flex-col gap-12 p-8">
      {/* Basic */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Basic</SectionTitle>
        <BasicForm />
      </div>
    </div>
  )
}
