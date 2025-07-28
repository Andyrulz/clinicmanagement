# Visit Management Design Guidelines

## Text Color Standards

### Headings and Titles

- **Primary Headings**: `text-gray-900` - Use for main page titles, form headers
- **Secondary Headings**: `text-gray-900` - Use for section titles, form group headers
- **Tertiary Headings**: `text-gray-900` - Use for subsection titles

### Body Text and Content

- **Primary Text**: `text-gray-900` - Use for main content, form values, important information
- **Secondary Text**: `text-gray-800` - Use for descriptive text, labels that need emphasis
- **Supporting Text**: `text-gray-700` - Use for form labels, metadata, less critical information

### Input Fields

- **Input Text**: `text-gray-900` - All input field text should be dark and readable
- **Placeholder Text**: `placeholder:text-gray-500` - Acceptable as placeholders are temporary
- **Input Background**: `bg-white` - Always use white background for form inputs
- **Label Text**: `text-gray-700` - Form labels should use this color

### States and Status

- **Success Text**: `text-green-600` or `text-green-700` - For positive states
- **Warning Text**: `text-yellow-600` or `text-yellow-700` - For warning states
- **Error Text**: `text-red-500` or `text-red-600` - For error states
- **Info Text**: `text-blue-600` or `text-blue-700` - For informational content

### Avoid These Colors (Too Light)

- ❌ `text-gray-400` - Too light, hard to read
- ❌ `text-gray-500` - Too light except for placeholders
- ❌ `text-gray-600` - Generally too light for main content

## Input Field Standards

### Standard Input Classes

```tsx
className =
  "mt-1 block w-full text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white";
```

### Input with Error State

```tsx
className={`mt-1 block w-full text-gray-900 placeholder:text-gray-500 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white ${
  errors.fieldName ? 'border-red-500' : 'border-gray-300'
}`}
```

### Select Fields

```tsx
className =
  "w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white";
```

### Textarea Fields

```tsx
className =
  "mt-1 block w-full text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white";
```

## Background and Layout Standards

### Page Background

- Use `bg-gray-50` for main page backgrounds
- Use `min-h-screen` for full-page layouts

### Card/Section Backgrounds

- Use `bg-white` for content cards and sections
- Use `border border-gray-200` for subtle borders

### Container Structure

```tsx
<div className="min-h-screen bg-gray-50">
  <div className="container mx-auto p-6 max-w-4xl">
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Content */}
    </div>
  </div>
</div>
```

## Temperature Standards

### Temperature Display

- **Always use Fahrenheit** for temperature inputs and displays
- **Input Range**: 86°F to 113°F (converted to Celsius for database storage)
- **Conversion Formula**: `celsius = (fahrenheit - 32) * 5/9`
- **Default Placeholder**: "e.g., 98.6"
- **Label**: "Temperature (°F)"

### Database Considerations

- Store temperature as `temperature_celsius` in database
- Convert from Fahrenheit to Celsius before saving
- Always validate temperature ranges in Fahrenheit before conversion

## Implementation Checklist

When creating new visit management components:

### Text Readability

- [ ] All main text uses `text-gray-900`
- [ ] Labels use `text-gray-700`
- [ ] Supporting text uses `text-gray-800`
- [ ] No text uses `text-gray-500` or lighter (except placeholders)

### Form Inputs

- [ ] All inputs use standard input classes
- [ ] Background is `bg-white`
- [ ] Text color is `text-gray-900`
- [ ] Placeholder uses `placeholder:text-gray-500`
- [ ] Focus states are properly configured

### Temperature Fields

- [ ] Uses Fahrenheit for display
- [ ] Converts to Celsius for storage
- [ ] Validates 86-113°F range
- [ ] Uses proper placeholder and label

### Layout

- [ ] Page uses `bg-gray-50` background
- [ ] Content sections use `bg-white`
- [ ] Proper container structure
- [ ] Consistent spacing and padding

This document should be referenced for all future visit management features to ensure consistency across the application.
