"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-foreground">{children}</h2>
}

function readFormValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<
    string,
    string
  >
}

function BasicForm() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState<string | null>(null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>
          We&apos;ll only use this to reach you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            const values = readFormValues(event.currentTarget)
            const nextErrors: Record<string, string> = {}
            if (!values.email) {
              nextErrors.email = "Email is required."
            }
            if (!values.username) {
              nextErrors.username = "Username is required."
            }
            setErrors(nextErrors)
            setSubmitted(
              Object.keys(nextErrors).length === 0
                ? JSON.stringify(values)
                : null
            )
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
      </CardContent>
    </Card>
  )
}

function SignupForm() {
  const [loading, setLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState(false)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start your free 14-day trial.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            const values = readFormValues(event.currentTarget)
            const nextErrors: Record<string, string> = {}
            if (!values.terms) {
              nextErrors.terms = "You must accept the terms to continue."
            }
            setErrors(nextErrors)
            if (Object.keys(nextErrors).length > 0) return

            setLoading(true)
            setTimeout(() => {
              setLoading(false)
              setSubmitted(true)
            }, 1200)
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
              <Input id="signup-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-role">Role</FieldLabel>
              <Select name="role" defaultValue="developer">
                <SelectTrigger id="signup-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <FieldLabel htmlFor="signup-terms">
                <Checkbox id="signup-terms" name="terms" size="sm" />
                <FieldContent>
                  <FieldTitle>I accept the terms of service</FieldTitle>
                </FieldContent>
              </FieldLabel>
              <FieldError errors={[{ message: errors.terms }]} />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-fit" disabled={loading}>
            {loading && <Spinner className="size-4" />}
            {loading ? "Creating account..." : "Create account"}
          </Button>
          {submitted && (
            <p className="mt-3 text-sm text-muted-foreground">
              Account created.
            </p>
          )}
        </Form>
      </CardContent>
    </Card>
  )
}

function ServerErrorsForm() {
  const [checking, setChecking] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState(false)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reserve a username</CardTitle>
        <CardDescription>
          Checked against existing accounts on submit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            const values = readFormValues(event.currentTarget)
            setChecking(true)
            setErrors({})
            setSubmitted(false)
            setTimeout(() => {
              setChecking(false)
              if (values.username === "admin") {
                setErrors({ username: "That username is already taken." })
                return
              }
              setSubmitted(true)
            }, 900)
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="server-username">Username</FieldLabel>
              <Input
                id="server-username"
                name="username"
                defaultValue="admin"
              />
              <FieldDescription>
                Try submitting as-is to see a server error.
              </FieldDescription>
              <FieldError errors={[{ message: errors.username }]} />
            </Field>
          </FieldGroup>
          <Button type="submit" className="mt-6 w-fit" disabled={checking}>
            {checking && <Spinner className="size-4" />}
            {checking ? "Checking..." : "Reserve username"}
          </Button>
          {submitted && (
            <p className="mt-3 text-sm text-muted-foreground">
              Username reserved.
            </p>
          )}
        </Form>
      </CardContent>
    </Card>
  )
}

const STEP_LABELS = ["Account", "Plan", "Review"]

function StepProgress({ step }: { step: number }) {
  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="flex gap-1.5">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
      </p>
    </div>
  )
}

function MultiStepForm() {
  const [step, setStep] = React.useState(1)
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    plan: "pro",
    terms: false,
  })
  const [submitted, setSubmitted] = React.useState(false)

  if (submitted) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent>
          <p className="font-medium text-foreground">All set!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {values.name} ({values.email}) signed up for the {values.plan} plan.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <StepProgress step={step} />
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={(event) => {
            event.preventDefault()
            const formValues = readFormValues(event.currentTarget)

            if (step === 1) {
              setValues((v) => ({
                ...v,
                name: formValues.name ?? "",
                email: formValues.email ?? "",
              }))
              setStep(2)
              return
            }

            if (step === 2) {
              setValues((v) => ({ ...v, plan: formValues.plan ?? v.plan }))
              setStep(3)
              return
            }

            setValues((v) => ({ ...v, terms: Boolean(formValues.terms) }))
            setSubmitted(true)
          }}
        >
          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="step-name">Full name</FieldLabel>
                <Input
                  id="step-name"
                  name="name"
                  defaultValue={values.name}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="step-email">Email</FieldLabel>
                <Input
                  id="step-email"
                  name="email"
                  type="email"
                  defaultValue={values.email}
                  required
                />
              </Field>
            </FieldGroup>
          )}
          {step === 2 && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="step-plan">Plan</FieldLabel>
                <Select name="plan" defaultValue={values.plan}>
                  <SelectTrigger id="step-plan" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          )}
          {step === 3 && (
            <FieldGroup>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="text-foreground">{values.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground">{values.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="text-foreground capitalize">
                    {values.plan}
                  </span>
                </div>
              </div>
              <Field orientation="vertical">
                <FieldLabel htmlFor="step-terms">
                  <Checkbox id="step-terms" name="terms" size="sm" required />
                  <FieldContent>
                    <FieldTitle>I accept the terms of service</FieldTitle>
                  </FieldContent>
                </FieldLabel>
              </Field>
            </FieldGroup>
          )}
          <div className="mt-6 flex items-center gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            <Button type="submit">{step < 3 ? "Next" : "Finish"}</Button>
          </div>
        </Form>
      </CardContent>
    </Card>
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

      {/* Signup with select, checkbox, and async submit */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Signup</SectionTitle>
        <SignupForm />
      </div>

      {/* Server-side validation errors */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Server-side errors</SectionTitle>
        <ServerErrorsForm />
      </div>

      {/* Multi-step with progress */}
      <div className="flex flex-col gap-4">
        <SectionTitle>Multi-step</SectionTitle>
        <MultiStepForm />
      </div>
    </div>
  )
}
