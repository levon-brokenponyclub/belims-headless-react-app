# Visual Interface Guide

## Plugin Interface Overview

### 1. Settings Page

**Location**: `WordPress Admin → Settings → AI Descriptions`

```
┌─────────────────────────────────────────────────┐
│ AI Descriptions Settings                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ API Configuration                               │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Configure your Google Gemini API key to enable │
│ AI-powered product descriptions.               │
│                                                 │
│ Get your API key from:                          │
│ https://aistudio.google.com/apikey              │
│                                                 │
│ Gemini API Key                                  │
│ ┌─────────────────────────────────────────┐    │
│ │ AIza...                                 │    │
│ └─────────────────────────────────────────┘    │
│ Enter your Google Gemini API key.              │
│                                                 │
│ ┌──────────────────┐                           │
│ │ Save Settings    │                           │
│ └──────────────────┘                           │
└─────────────────────────────────────────────────┘
```

### 2. Product Edit Screen - Meta Box

**Location**: `Products → Edit Product → Right Sidebar`

```
┌─────────────────────────────────────────────────┐
│ 📦 Publish                                      │
├─────────────────────────────────────────────────┤
│ [Save Draft] [Preview] [Publish]               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🤖 AI Product Description Generator            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Generate an AI-powered product description     │
│ using Google Gemini.                            │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ 🦸 Generate AI Description              │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. After Clicking "Generate AI Description"

**State**: Loading

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Product Description Generator            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ 🦸 Generate AI Description (disabled)   │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ⏳ Generating description...                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Description Generated Successfully

**State**: Preview with Apply Button

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Product Description Generator            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ 🦸 Generate AI Description              │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ ✅ Apply to Product                     │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ Generated Description:                          │
│ ┌─────────────────────────────────────────┐    │
│ │ 🔥 Professional Grade: Bosch delivers   │    │
│ │ exceptional quality with this           │    │
│ │ GSB 13 RE Drill. Perfect for both       │    │
│ │ professional contractors and serious    │    │
│ │ DIY enthusiasts. Features powerful      │    │
│ │ 600W motor, variable speed control,     │    │
│ │ and ergonomic design for comfortable    │    │
│ │ extended use. Trusted by professionals  │    │
│ │ nationwide for reliable performance.    │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. After Clicking "Apply to Product"

**State**: Success Confirmation

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Product Description Generator            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ✅ Description applied successfully!            │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ 🦸 Generate AI Description              │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ ✅ Apply to Product                     │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ Generated Description:                          │
│ ┌─────────────────────────────────────────┐    │
│ │ 🔥 Professional Grade: Bosch delivers...│    │
│ └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6. Error State

**State**: Error Message Displayed

```
┌─────────────────────────────────────────────────┐
│ 🤖 AI Product Description Generator            │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ 🦸 Generate AI Description              │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
│ ┌─────────────────────────────────────────┐    │
│ │ ❌ ERROR                                │    │
│ │ Gemini API key not configured.          │    │
│ │ Please configure it in Settings →       │    │
│ │ AI Descriptions.                        │    │
│ └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Button States & Colors

### Generate AI Description Button

- **Default**: Blue gradient background, white text
- **Hover**: Darker blue, slight lift effect
- **Active/Pressed**: Pressed down appearance
- **Disabled**: Faded opacity, no interactions

### Apply to Product Button

- **Default**: Green background, white text
- **Hover**: Darker green
- **Success**: Pulse animation with green glow

## Workflow Diagram

```
Start
  │
  ├─→ Edit Product Page
  │     │
  │     ├─→ See Meta Box in Sidebar
  │     │     │
  │     │     ├─→ Click "Generate AI Description"
  │     │     │     │
  │     │     │     ├─→ [Loading State]
  │     │     │     │     │
  │     │     │     │     ├─→ Success
  │     │     │     │     │     │
  │     │     │     │     │     ├─→ Preview Description
  │     │     │     │     │     │     │
  │     │     │     │     │     │     ├─→ Click "Apply to Product"
  │     │     │     │     │     │     │     │
  │     │     │     │     │     │     │     ├─→ Description Added to Editor
  │     │     │     │     │     │     │     │     │
  │     │     │     │     │     │     │     │     └─→ Click "Update" to Save
  │     │     │     │     │     │     │     │
  │     │     │     │     │     │     │     └─→ Done! ✅
  │     │     │     │     │     │     │
  │     │     │     │     │     │     └─→ Or Generate Again for Different Version
  │     │     │     │     │
  │     │     │     │     └─→ Error
  │     │     │     │           │
  │     │     │     │           └─→ Show Error Message
  │     │     │     │                 │
  │     │     │     │                 └─→ Fix Issue & Try Again
  │
  └─→ Settings Page (if API key not configured)
        │
        └─→ Add API Key → Save → Return to Product
```

## Color Scheme

```css
Primary Blue:    #2271b1  /* Main buttons */
Dark Blue:       #135e96  /* Hover states */
Success Green:   #00a32a  /* Apply button */
Error Red:       #dc3232  /* Error messages */
Background:      #f9f9f9  /* Preview area */
Border:          #c3c4c7  /* Subtle borders */
Text Dark:       #1d2327  /* Primary text */
Text Light:      #646970  /* Secondary text */
```

## Spacing & Sizing

- **Meta Box Width**: Full width of sidebar (~280px)
- **Button Height**: 44px (generate), 36px (apply)
- **Preview Max Height**: 300px with scroll
- **Gap Between Elements**: 10-15px
- **Padding**: 10-15px for containers

## Accessibility Features

- ✅ High contrast colors
- ✅ Clear focus states
- ✅ Descriptive button text
- ✅ Loading indicators with text
- ✅ Error messages are readable
- ✅ Keyboard navigation support

---

**Note**: This is a text-based visual guide. The actual UI will have these elements styled with CSS for a polished look.
