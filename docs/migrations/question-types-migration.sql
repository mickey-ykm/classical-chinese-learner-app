-- Add question_types column to questions table
ALTER TABLE questions ADD COLUMN question_types text[] DEFAULT '{}';

-- Add CHECK constraint to ensure only valid question types
ALTER TABLE questions ADD CONSTRAINT valid_question_types
  CHECK (
    question_types <@ ARRAY[
      '字詞解釋',
      '語句背誦',
      '語句翻譯',
      '修辭手法',
      '內容重點'
    ]::text[]
  );

-- Add comment for documentation
COMMENT ON COLUMN questions.question_types IS 'Array of question type labels: 字詞解釋, 語句背誦, 語句翻譯, 修辭手法, 內容重點';
