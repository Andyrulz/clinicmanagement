# 🎨 Design System & Accessibility Guidelines

## 📋 Overview

This document establishes the design standards for the Clinic Management System to ensure **high contrast, accessibility, and professional appearance** throughout the application.

---

## 🎯 Accessibility Standards

### WCAG 2.1 AA Compliance

- **Minimum contrast ratio**: 4.5:1 for normal text
- **Large text contrast**: 3:1 for 18pt+ or 14pt+ bold
- **Focus indicators**: Visible 2px outline for keyboard navigation
- **Touch targets**: Minimum 44px clickable area

---

## 🎨 Color Palette (High Contrast)

### Text Colors

```css
/* Primary text - Use for headings and important content */
text-gray-900     /* #111827 - Contrast ratio: 19.56:1 on white */

/* Secondary text - Use for body text and labels */
text-gray-800     /* #1F2937 - Contrast ratio: 15.56:1 on white */

/* Tertiary text - Use for supporting information */
text-gray-700     /* #374151 - Contrast ratio: 11.9:1 on white */

/* Muted text - Use sparingly for helper text */
text-gray-600     /* #4B5563 - Contrast ratio: 8.89:1 on white */

/* Avoid using text-gray-500 or lighter for important content */
```

### Background Colors

```css
/* Primary backgrounds */
bg-white          /* #FFFFFF - Main content areas */
bg-gray-50        /* #F9FAFB - Page backgrounds */
bg-gray-100       /* #F3F4F6 - Subtle containers */

/* Status backgrounds (all have 2px borders for better definition) */
bg-green-50       /* Success states */
bg-yellow-50      /* Warning states */
bg-red-50         /* Error states */
bg-blue-50        /* Info states */
```

### Interactive Elements

```css
/* Primary buttons */
bg-blue-600 hover:bg-blue-700 text-white
focus:ring-2 focus:ring-blue-500 focus:ring-offset-2

/* Secondary buttons */
bg-gray-600 hover:bg-gray-700 text-white
focus:ring-2 focus:ring-gray-500 focus:ring-offset-2

/* Danger buttons */
bg-red-600 hover:bg-red-700 text-white
focus:ring-2 focus:ring-red-500 focus:ring-offset-2

/* Disabled buttons */
bg-gray-300 text-gray-500 cursor-not-allowed
```

---

## 📝 Typography Standards

### Heading Hierarchy

```css
/* H1 - Page titles */
text-2xl font-bold text-gray-900

/* H2 - Section titles */
text-xl font-bold text-gray-900

/* H3 - Subsection titles */
text-lg font-bold text-gray-800

/* H4 - Component titles */
text-base font-bold text-gray-800

/* Body text */
text-gray-800 font-medium

/* Caption text */
text-sm text-gray-700 font-medium

/* Small text */
text-xs text-gray-600
```

### Font Weights

- **font-bold**: Headings and important labels
- **font-semibold**: Button text and emphasized content
- **font-medium**: Body text and form labels
- **font-normal**: Less important content (use sparingly)

---

## 🧩 Component Standards

### Form Elements

```css
/* Labels */
text-sm font-semibold text-gray-900

/* Input fields */
text-gray-900 placeholder:text-gray-500
border-2 border-gray-300
focus:border-blue-500 focus:ring-2 focus:ring-blue-500

/* Helper text */
text-sm text-gray-700 font-medium

/* Error text */
text-sm text-red-900 font-medium
```

### Cards & Containers

```css
/* Standard card */
bg-white border-2 border-gray-200 rounded-lg shadow-sm
hover:shadow-md transition-shadow

/* Elevated card */
bg-white border-2 border-gray-200 rounded-lg shadow-md
hover:shadow-lg transition-shadow

/* Status cards */
bg-green-50 border-2 border-green-200  /* Success */
bg-yellow-50 border-2 border-yellow-200  /* Warning */
bg-red-50 border-2 border-red-200     /* Error */
bg-blue-50 border-2 border-blue-200   /* Info */
```

### Role Badges (High Contrast)

```css
/* Admin */
bg-red-100 text-red-900 border-2 border-red-200

/* Manager */
bg-blue-100 text-blue-900 border-2 border-blue-200

/* Doctor */
bg-green-100 text-green-900 border-2 border-green-200

/* Receptionist */
bg-purple-100 text-purple-900 border-2 border-purple-200

/* Staff */
bg-gray-100 text-gray-900 border-2 border-gray-200
```

---

## 🔧 Implementation Guidelines

### DO's ✅

- **Always use font-bold or font-semibold** for headings
- **Use 2px borders** for better visual definition
- **Add focus states** to all interactive elements
- **Use consistent spacing** (p-4, p-6 for containers)
- **Test with screen readers** and keyboard navigation
- **Use semantic HTML** elements (button, label, etc.)

### DON'Ts ❌

- **Never use text-gray-500 or lighter** for important content
- **Avoid thin borders** (use border-2 instead of border)
- **Don't rely only on color** to convey information
- **Avoid font-light or font-thin** - they're hard to read
- **Don't use placeholder text** as form labels
- **Avoid small touch targets** under 44px

---

## 🎯 Quick Reference Classes

### High Contrast Text Combinations

```css
/* Best readability */
text-gray-900 bg-white
text-white bg-gray-900
text-blue-900 bg-blue-50
text-green-900 bg-green-50
text-red-900 bg-red-50
text-yellow-900 bg-yellow-50

/* Status text on colored backgrounds */
text-green-900 bg-green-50    /* Success */
text-yellow-900 bg-yellow-50  /* Warning */
text-red-900 bg-red-50        /* Error */
text-blue-900 bg-blue-50      /* Info */
```

### Button Classes (Copy-Paste Ready)

```css
/* Primary button */
"px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"

/* Secondary button */
"px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"

/* Danger button */
"px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"

/* Disabled button */
"px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
```

### Form Classes (Copy-Paste Ready)

```css
/* Label */
"block text-sm font-semibold text-gray-900 mb-2"

/* Input field */
"w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"

/* Select field */
"w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
```

---

## 🧪 Testing Checklist

### Visual Testing

- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] Focus indicators are visible and prominent
- [ ] UI works in high contrast mode
- [ ] Text remains readable when zoomed to 200%

### Functional Testing

- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader announces content correctly
- [ ] Form labels are properly associated
- [ ] Error messages are clear and helpful

---

## 📱 Future Considerations

### Mobile Responsiveness

- **Touch targets**: Minimum 44px for mobile
- **Text size**: Never smaller than 16px on mobile
- **Spacing**: Adequate spacing between interactive elements

### Dark Mode (Future Phase)

- When implementing dark mode, maintain same contrast ratios
- Use `text-gray-100` on `bg-gray-900` for dark mode
- Ensure status colors remain distinguishable

---

**🎯 Remember**: Accessibility isn't just for users with disabilities - high contrast and clear typography benefit everyone, especially in medical environments where clarity is critical!
