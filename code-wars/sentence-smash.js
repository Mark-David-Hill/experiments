// Sentence Smash
// Write a function that takes an array of words and smashes them together into a sentence and returns the sentence. You can ignore any need to sanitize words or add punctuation, but you should add spaces between each word. Be careful, there shouldn't be a space at the beginning or the end of the sentence!

// Example
// ['hello', 'world', 'this', 'is', 'great']  =>  'hello world this is great'

function smash(words) {
  let sentence = "";
  for (i = 0; i < words.length; i++) {
    if (i > 0 && i < words.length) {
      sentence += " ";
    }
    sentence += words[i];
  }
  return sentence;
}
