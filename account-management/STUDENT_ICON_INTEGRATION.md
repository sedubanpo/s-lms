# Student Icons

Read `sharedIconAssets` by its stable lookupKey:

- `student-gender:male`: male student
- `student-gender:female`: female student

The stored category is `PERSON`, targetType is `NAMED`, storage prefix is
`shared-icons/people/`. Account Management presents these as the Student Icons tab.
This retains existing shared-asset storage and permission conventions.

Use the current document imageUrl; do not hardcode a Storage URL because replacement
can change it. Render 20-28px before the student's name with an empty alt attribute
when the icon is decorative. Preserve the name if an image fails to load.

Use only explicitly recorded gender values. Never infer gender from a name or photo.
For missing, undisclosed or other values, omit this icon or use a neutral fallback.
This change does not add gender data to student records or modify other webapps.
