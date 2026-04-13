# Datepicker with `templ` and Datastar

This repository currently exposes the datepicker as plain browser code. The new [`script.ts`](./script.ts) file is the typed source version of your existing [`script.js`](./script.js).

The important detail is that the picker is still DOM-driven. It looks up fixed IDs such as `single-date`, `single-grid`, `range-start`, and `range-popover`. When you render the same structure from Go using `templ`, the picker works without needing a framework rewrite.

## What the script does

### Helper functions

- `filterNumbers(value)` removes everything except digits.
- `limitDateDigits(value)` limits the raw date input to `DDMMYYYY`.
- `dateMaskABNT(value)` formats the typed digits as `DD/MM/AAAA`.
- `parseDateFromMask(maskValue)` validates a masked date and returns a UTC `Date` or `null`.
- `formatDateToMask(date)` formats a `Date` back to `DD/MM/AAAA`.
- `normalizeUTCDate(date)` strips the time portion and keeps only the UTC calendar date.
- `isSameUTCDate(dateA, dateB)` compares two dates by UTC day, month, and year.
- `isDateBetweenUTC(date, start, end)` checks whether a day is inside the selected range.
- `getDaysInMonthUTC(year, monthIndex)` returns the number of days in a month.
- `getFirstDayOfMonthUTC(year, monthIndex)` returns the first weekday of the month.
- `formatCalendarTitle(viewDate)` returns the calendar header such as `Abril 2026`.

### Main classes

- `InputDateBase` owns one input field, applies the ABNT mask, stores the parsed date, and updates the visible value.
- `PopoverController` opens and closes the floating calendar and decides whether it should open above or below the field.
- `SingleDatePicker` wires one input to one calendar.
- `RangeDatePicker` wires two inputs to one calendar and keeps `startDate <= endDate`.

## Required HTML contract

The current implementation is not generic yet. It expects these IDs to exist:

### Single picker

- `single-picker`
- `single-date`
- `single-trigger`
- `single-popover`
- `single-title`
- `single-prev`
- `single-next`
- `single-grid`

### Range picker

- `range-picker`
- `range-start`
- `range-end`
- `range-popover`
- `range-title`
- `range-prev`
- `range-next`
- `range-grid`

If you change these IDs in `templ`, you must also change them in `script.ts`.

## Using it from `templ`

Render the same markup shape from a `templ` component and include the built JavaScript on the page. A minimal single picker component looks like this:

```go
package ui

import "github.com/a-h/templ"

templ SingleDatePicker() {
    <div id="single-picker" class="relative max-w-sm">
        <div class="flex gap-2">
            <input
                id="single-date"
                type="text"
                name="date"
                placeholder="DD/MM/AAAA"
                class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none"
            />
            <button
                id="single-trigger"
                type="button"
                class="rounded-lg border border-zinc-300 bg-white px-4 py-2"
            >
                📅
            </button>
        </div>

        <div
            id="single-popover"
            class="hidden absolute left-0 z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-4 shadow-xl"
        >
            <div class="mb-4 flex items-center justify-between">
                <button id="single-prev" type="button">←</button>
                <span id="single-title"></span>
                <button id="single-next" type="button">→</button>
            </div>
            <div id="single-grid" class="grid grid-cols-7 gap-1"></div>
        </div>
    </div>
}
```

Then include your script in the page layout:

```go
templ Page() {
    <html lang="pt-BR">
        <head>
            <script src="/static/script.js"></script>
        </head>
        <body>
            @SingleDatePicker()
        </body>
    </html>
}
```

`templ` itself only renders HTML on the server. The datepicker behavior still runs in the browser, so `script.ts` must be compiled to `script.js` and served as a static asset.

Official references:

- templ docs: https://templ.guide/
- Datastar attributes reference: https://data-star.dev/reference/attributes
- Datastar SSE events reference: https://data-star.dev/reference/sse_events

## Using it with Datastar

Datastar is useful here for server synchronization, validation feedback, and progressive enhancement. The datepicker code does not depend on Datastar, so the clean approach is:

1. Let the datepicker own the visible input and calendar interactions.
2. Let Datastar observe or submit the input values.
3. Let Go return HTML fragments or signals when the server needs to react.

### Pattern 1: submit the selected date with a normal form

This is the simplest option. Your input already receives a value such as `12/04/2026`, so standard form submission works.

```go
templ SearchForm() {
    <form data-on-submit="@post('/search')">
        @SingleDatePicker()
        <button type="submit">Buscar</button>
    </form>
}
```

### Pattern 2: keep Datastar signals next to the datepicker

If you want Datastar-managed state, mirror the value into a signal-friendly element. The browser script updates the input value, and Datastar can read it during requests.

```go
templ FilterPanel() {
    <section
        data-signals="{ checkIn: '', checkOut: '' }"
        class="space-y-4"
    >
        <div id="range-picker" class="relative max-w-2xl">
            <div class="grid grid-cols-2 gap-3">
                <input
                    id="range-start"
                    name="check_in"
                    type="text"
                    placeholder="Data inicial"
                    data-bind-check-in
                />
                <input
                    id="range-end"
                    name="check_out"
                    type="text"
                    placeholder="Data final"
                    data-bind-check-out
                />
            </div>

            <div id="range-popover" class="hidden absolute left-0 z-50">
                <button id="range-prev" type="button">←</button>
                <span id="range-title"></span>
                <button id="range-next" type="button">→</button>
                <div id="range-grid" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    </section>
}
```

In practice, you would usually add a small Datastar binding layer after the picker initializes, for example reading `#range-start` and `#range-end` during `data-on-input`, `data-on-change`, or `data-on-submit`.

### Pattern 3: patch server-rendered fragments after a date changes

Datastar works well if changing a date should refresh availability, prices, or validation messages. The browser sends the selected dates to Go, and the Go handler responds with HTML or signal patches.

Server-side idea:

```go
func Availability(w http.ResponseWriter, r *http.Request) {
    start := r.FormValue("check_in")
    end := r.FormValue("check_out")

    fragment := templ.Handler(AvailabilitySummary(start, end))
    fragment.ServeHTTP(w, r)
}
```

Template usage:

```go
templ BookingPage() {
    <div class="space-y-4">
        @RangeDatePicker()

        <div
            id="availability-summary"
            data-on-change="@get('/availability')"
        ></div>
    </div>
}
```

If you want full Datastar SSE updates, return Datastar patch events from Go so the page can update only the target area or related signals. Datastar documents this with `datastar-patch-elements` and `datastar-patch-signals`.

## Recommended integration shape in Go

If you plan to reuse this picker more than once, move away from hard-coded IDs. The current script creates exactly one single picker and one range picker:

```ts
new SingleDatePicker();
new RangeDatePicker();
```

That is acceptable for a playground, but in a Go application you will usually want reusable components. The next refactor should be:

1. Pass a root element into each picker class instead of fixed string IDs.
2. Use `data-*` selectors inside that root.
3. Allow multiple picker instances on the same page.
4. Emit custom events such as `datepicker:change` so Datastar hooks can react cleanly.

## Suggested Go component API

If you want to wrap this in `templ`, a practical API is:

```go
type DatePickerProps struct {
    ID          string
    Name        string
    Label       string
    Placeholder string
    Value       string
}
```

For range mode:

```go
type DateRangePickerProps struct {
    ID             string
    StartName      string
    EndName        string
    StartValue     string
    EndValue       string
    StartLabel     string
    EndLabel       string
}
```

Then use the `ID` value to generate unique child IDs like:

- `booking-checkin-date`
- `booking-checkin-popover`
- `booking-range-grid`

That change would make the frontend much easier to reuse from Go.

## Build note

Browsers do not execute `.ts` directly. Use `script.ts` as the source file and generate `script.js` for production.

If you want, the next step can be a real reusable refactor so the picker works with multiple `templ` components on the same page and exposes clean hooks for Datastar events.
