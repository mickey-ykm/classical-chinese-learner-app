1. Quiz Prompts (Prompt management section), the new default prompt "phase7-multi-type" is gone after git deployment. I think these prompt version should be saved to supa base too.
2. For "Add a new article", level field is not needed anymore.
3. For "Add a new article", we need a drop down `article type` option to choose whether the acticle is "DSE 12 exam articles", "DSE non-exam articles" and "Other articles".
4. For "Add a new article", put the expected finishing time field here.
5. For "Add a new article", put the chapter challenge checkbox here.
6. For "Add a new article", put the "Free or not" checkbox here.
7. For "Article library", the list column should add `article type` and `free or not`. take out level from the column.
8. In "Article library > edit an article", before the user clicks "Edit", the rest of editing in the page, generate quiz, add question functions should all be disabled.
9. In "Article library > edit an article", when an article has quiz json generated, the "Generate Quiz" button should be named as "Re-generate quiz". And a pop-up alert should warn the user that the existing questions and answers will all be rewritten and this action cannot roll back.
10. In "Article library > edit an article > Questions", the list should be refreshed upon quiz generation.
11. In "Article library > edit an article > Questions", a tag of qestion type should be showing on the list.
12. In "Article library > edit an article > Questions > edit question", the save button is not responding after clicking.
13. I think a better workflow should be:
13a. The user adds an article from "Add a new article" page. the existing function is alright.
13b. The user navigates to the article detail page, choose the prompt set, input Openrouter key and generate.
13c. The generated questions should be saved as draft for users to review before publishing.
13d. The user review and edited the draft questions and answers, and then publish.
13e. In the article detail page, the user should see a list of published questions and a list of draft questions. The user can select multiple draft questions to delete.
