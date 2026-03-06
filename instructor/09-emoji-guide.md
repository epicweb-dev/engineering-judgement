# Emoji Character Guide

Epic Workshops use emoji characters to guide learners. Each emoji represents a specific role.

## Character Reference

| Emoji | Name | Role |
|-------|------|------|
| 👨‍💼 | Peter the Product Manager | Helps us know what our users want |
| 💼 | Berry the Business Owner | Defines business goals and viability constraints |
| 👤 | Una the User | Represents real user workflow pain and needs |
| 🧝‍♀️ | Kellie the Co-worker | Does work ahead of your exercises |
| 🐨 | Kody the Koala | Tells you something specific to do |
| 🦺 | Lily the Life Jacket | TypeScript-specific help |
| 💰 | Marty the Money Bag | Specific tips and code hints |
| 📝 | Nancy the Notepad | Encourages note-taking |
| 🦉 | Olivia the Owl | Best practice notes |
| 📜 | Dominic the Document | Links to documentation |
| 💣 | Barry the Bomb | Code to delete |
| 🚨 | Alfred the Alert | Test failure explanations |

## Usage in Code Comments

```tsx
// 🐨 [What to do]
// 💰 [Hint showing how]
// 📜 [Link to documentation]

function MyComponent() {
  // 🐨 Add useState hook here
  // 💰 const [state, setState] = useState(initialValue)

  // 🦺 Add type annotation
  // @ts-expect-error 💣 Remove when typed

  return (
    <div>
      {/* 🐨 Render the state here */}
    </div>
  )
}
```

### HTML Comments

```html
<!-- 🐨 Add a div with id="root" here -->

<!-- 🐨 Create a script tag with type="module" -->
<!--    📜 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules -->

<!-- 🐨 Get the root element using document.getElementById -->
<!--    💰 const root = document.getElementById('root') -->
```

## Usage in README.mdx Files

### Problem Instructions (XX.problem.step-name/README.mdx)

```mdx
# Step Title

👨‍💼 [Context and user need]

🧝‍♀️ [What's already been set up, if applicable]

🐨 [Main instructions with file reference]

💰 [Helpful hints]

📜 [Documentation links]

📝 [Reflection prompt, if appropriate]
```

### Solution Explanation (XX.solution.step-name/README.mdx)

```mdx
# Step Title

👨‍💼 [Brief confirmation of completion]

🦉 [Key insight or best practice]
```

### Exercise Summary (FINISHED.mdx)

```mdx
# Exercise Title

👨‍💼 [Celebration and summary]

📝 [Encourage notes on key takeaways]
```

## Test Failure Messages

Use Alfred (🚨) in test assertion messages:

```tsx
expect(
  myFunction,
  `🚨 Make sure you exported the function as a named export, not default`
).toBeDefined()
```

## Character Guidelines

### 👨‍💼 Peter
- Friendly and encouraging
- Thinks about users and business needs
- Celebrates success ("Great job!", "Perfect!")

### 💼 Berry
- Outcome-focused and pragmatic
- Clarifies viability, timeline, and scope boundaries
- Anchors decisions to business impact

### 👤 Una
- Grounded in real user behavior
- Highlights friction in actual workflows
- Clarifies what is required vs merely nice to have

### 🐨 Kody
- Direct and helpful
- Uses action verbs ("Open", "Add", "Create")
- Breaks tasks into clear steps

### 🧝‍♀️ Kellie
- Helpful colleague vibe
- Explains work that's been done or will be done
- Uses diff links to show changes

**Kellie explains past work** (with `<PrevDiffLink />`):
```mdx
🧝‍♀️ I've already set up the form validation for the email field.
<PrevDiffLink>You can check what I did here.</PrevDiffLink>
```

**Kellie explains upcoming work** (with `<NextDiffLink />`):
```mdx
🧝‍♀️ In the next step, I'll apply the same pattern to the remaining
form fields. If you'd like more practice, feel free to do it yourself
before moving on!
<NextDiffLink>Check the upcoming changes</NextDiffLink>
```

Use Kellie when:
- Work was done between steps that learners didn't see
- Repetitive work will be done that learners can skip or try themselves
- Setting up boilerplate that isn't the focus of the exercise

### 🦺 Lily
- Technical and precise
- Focused on type safety
- Explains TypeScript-specific concepts

### 💰 Marty
- Generous with hints
- Provides code snippets
- Helps when stuck

### 📜 Dominic
- Points to authoritative sources
- Links to official docs

### 📝 Nancy
- Encourages active learning
- Prompts reflection

### 🦉 Olivia
- Wise and insightful
- Shares best practices
- Explains the "why"

### 💣 Barry
- Marks code for deletion
- Indicates temporary code

### 🚨 Alfred
- Helps debug test failures
- Explains common mistakes
- Appears in test assertion messages
