const express = require('express');
const bodyParser = require('body-parser');
const csv = require('csv-parser');
const fs = require('fs');
const _ = require('lodash');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Load movie data
let movieData = [];
fs.createReadStream('movies.csv')
  .pipe(csv())
  .on('data', (row) => {
    const genresVector = row.genres.split('|').map((genre) => genre.toLowerCase());
    movieData.push({
      movieId: row.movieId,
      title: row.title,
      genres: genresVector,
    });
  })
  .on('end', () => {
    console.log('Movies loaded:', movieData.length);
  });

// Calculate similarity
function calculateSimilarity(targetGenres, movieGenres) {
  const commonGenres = targetGenres.filter((genre) => movieGenres.includes(genre));
  return commonGenres.length / Math.sqrt(targetGenres.length * movieGenres.length);
}

// API to get recommendations
app.post('/recommend', (req, res) => {
  const { likedMovies } = req.body;

  if (!likedMovies || likedMovies.length === 0) {
    return res.status(400).json({ error: 'No liked movies provided.' });
  }

  // Find liked movie genres
  const likedGenres = likedMovies
    .map((movieId) => {
      const movie = movieData.find((m) => m.movieId === movieId);
      return movie ? movie.genres : [];
    })
    .flat();

  if (likedGenres.length === 0) {
    return res.status(404).json({ error: 'No genres found for liked movies.' });
  }

  // Recommend movies based on similarity
  const recommendations = movieData
    .map((movie) => ({
      title: movie.title,
      similarity: calculateSimilarity(likedGenres, movie.genres),
    }))
    .filter((rec) => rec.similarity > 0) // Exclude unrelated movies
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10); // Limit to top 10 recommendations

  res.json({ recommendations });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
