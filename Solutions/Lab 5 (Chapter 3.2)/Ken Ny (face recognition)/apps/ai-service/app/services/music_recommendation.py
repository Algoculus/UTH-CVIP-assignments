"""
Music Recommendation Service based on Emotion and Mood
Recommends music that matches the detected emotion
"""

class MusicRecommendationService:
    """
    Service to recommend music based on detected emotions and mood.
    Uses a curated database of music categorized by emotion.
    """
    
    def __init__(self):
        # Music database categorized by emotion
        # Using YouTube Music IDs and Spotify URIs
        self.music_database = {
            'happy': [
                {
                    'title': 'Happy',
                    'artist': 'Pharrell Williams',
                    'youtube_id': 'ZbZSe6N_BXs',
                    'spotify_uri': 'spotify:track:60nZcImufyMA1MKQY3dcCH',
                    'mood_score': 0.9,
                    'genre': 'Pop'
                },
                {
                    'title': 'Good Vibrations',
                    'artist': 'The Beach Boys',
                    'youtube_id': 'Eab_beh07HU',
                    'spotify_uri': 'spotify:track:54AloPoiQcH8GbYe0kPZ5q',
                    'mood_score': 0.85,
                    'genre': 'Pop Rock'
                },
                {
                    'title': 'Walking on Sunshine',
                    'artist': 'Katrina and the Waves',
                    'youtube_id': 'iPUmE-tne5U',
                    'spotify_uri': 'spotify:track:05wIrZSwuaVWhcv5FfqeH0',
                    'mood_score': 0.88,
                    'genre': 'Pop'
                },
                {
                    'title': 'Don\'t Stop Me Now',
                    'artist': 'Queen',
                    'youtube_id': 'HgzGwKwLmgM',
                    'spotify_uri': 'spotify:track:7hQJA50XrCWABAu5v6QZ4i',
                    'mood_score': 0.92,
                    'genre': 'Rock'
                }
            ],
            'sad': [
                {
                    'title': 'Someone Like You',
                    'artist': 'Adele',
                    'youtube_id': 'hLQl3WQQoQ0',
                    'spotify_uri': 'spotify:track:1zwMYTA5nlNjZxYrvBB2pV',
                    'mood_score': -0.7,
                    'genre': 'Pop'
                },
                {
                    'title': 'The Scientist',
                    'artist': 'Coldplay',
                    'youtube_id': 'RB-RcX5DS5A',
                    'spotify_uri': 'spotify:track:75JFxkI2RXiU7L9VXzMkle',
                    'mood_score': -0.6,
                    'genre': 'Alternative'
                },
                {
                    'title': 'Hurt',
                    'artist': 'Johnny Cash',
                    'youtube_id': '8AHCfZTRGiI',
                    'spotify_uri': 'spotify:track:5SpKGFAQqW6MqmfoHVNKWC',
                    'mood_score': -0.8,
                    'genre': 'Country'
                },
                {
                    'title': 'Mad World',
                    'artist': 'Gary Jules',
                    'youtube_id': '4N3N1MlvVc4',
                    'spotify_uri': 'spotify:track:3JOVTQ5h8HGFnDdp4VT3MP',
                    'mood_score': -0.65,
                    'genre': 'Alternative'
                }
            ],
            'angry': [
                {
                    'title': 'Break Stuff',
                    'artist': 'Limp Bizkit',
                    'youtube_id': 'ZpUYjpKg9KY',
                    'spotify_uri': 'spotify:track:3UmaczJpikHgJFyBTAJVoz',
                    'mood_score': -0.75,
                    'genre': 'Nu Metal'
                },
                {
                    'title': 'Killing in the Name',
                    'artist': 'Rage Against the Machine',
                    'youtube_id': 'bWXazVhlyxQ',
                    'spotify_uri': 'spotify:track:59WN2psjkt1tyaxjspN8fp',
                    'mood_score': -0.8,
                    'genre': 'Rock'
                },
                {
                    'title': 'Bodies',
                    'artist': 'Drowning Pool',
                    'youtube_id': '04F4xlWSFh0',
                    'spotify_uri': 'spotify:track:4w8niZpiMy6qz1mntFA5uM',
                    'mood_score': -0.85,
                    'genre': 'Metal'
                }
            ],
            'surprise': [
                {
                    'title': 'Uptown Funk',
                    'artist': 'Mark Ronson ft. Bruno Mars',
                    'youtube_id': 'OPf0YbXqDm0',
                    'spotify_uri': 'spotify:track:32OlwWuMpZ6b0aN2RZOeMS',
                    'mood_score': 0.7,
                    'genre': 'Funk'
                },
                {
                    'title': 'Dynamite',
                    'artist': 'BTS',
                    'youtube_id': 'gdZLi9oWNZg',
                    'spotify_uri': 'spotify:track:0t1kP63rueHleOhQkYSXFY',
                    'mood_score': 0.75,
                    'genre': 'Pop'
                }
            ],
            'fear': [
                {
                    'title': 'Breathe Me',
                    'artist': 'Sia',
                    'youtube_id': 'SFGvmrJ5rjM',
                    'spotify_uri': 'spotify:track:7w87IxuO7BDcJ3YUqCyMTT',
                    'mood_score': -0.5,
                    'genre': 'Alternative'
                },
                {
                    'title': 'Fix You',
                    'artist': 'Coldplay',
                    'youtube_id': 'k4V3Mo61fJM',
                    'spotify_uri': 'spotify:track:7LVHVU3tWfcxj5aiPFEW4Q',
                    'mood_score': -0.3,
                    'genre': 'Alternative'
                }
            ],
            'disgust': [
                {
                    'title': 'Toxic',
                    'artist': 'Britney Spears',
                    'youtube_id': 'LOZuxwVk7TU',
                    'spotify_uri': 'spotify:track:6I9VzXrHxO9rA9A5euc8Ak',
                    'mood_score': 0.3,
                    'genre': 'Pop'
                }
            ],
            'neutral': [
                {
                    'title': 'Weightless',
                    'artist': 'Marconi Union',
                    'youtube_id': 'UfcAVejslrU',
                    'spotify_uri': 'spotify:track:3jjsRKEsF0YsEOPQyJfZZ4',
                    'mood_score': 0.0,
                    'genre': 'Ambient'
                },
                {
                    'title': 'Clair de Lune',
                    'artist': 'Claude Debussy',
                    'youtube_id': 'CvFH_6DNRCY',
                    'spotify_uri': 'spotify:track:1prBHLRgKIU3TOqRDLmXvO',
                    'mood_score': 0.1,
                    'genre': 'Classical'
                },
                {
                    'title': 'Lofi Hip Hop Radio',
                    'artist': 'ChilledCow',
                    'youtube_id': '5qap5aO4i9A',
                    'spotify_uri': 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn',
                    'mood_score': 0.0,
                    'genre': 'Lofi'
                }
            ]
        }
    
    def get_music_recommendations(self, emotion: str, mood_score: float, count: int = 3):
        """
        Get music recommendations based on emotion and mood score.
        
        Args:
            emotion: Detected emotion (happy, sad, angry, etc.)
            mood_score: Mood score from -1 to 1
            count: Number of recommendations to return
            
        Returns:
            List of music recommendations
        """
        # Get songs for the detected emotion
        emotion_songs = self.music_database.get(emotion.lower(), [])
        
        if not emotion_songs:
            # Fallback to neutral if emotion not found
            emotion_songs = self.music_database.get('neutral', [])
        
        # Sort by how close the mood_score matches the song's mood_score
        sorted_songs = sorted(
            emotion_songs,
            key=lambda song: abs(song['mood_score'] - mood_score)
        )
        
        # Return top N recommendations
        recommendations = sorted_songs[:count]
        
        # Add match score
        for rec in recommendations:
            rec['match_score'] = 1 - abs(rec['mood_score'] - mood_score)
            rec['reason'] = self._get_recommendation_reason(emotion, mood_score)
        
        return recommendations
    
    def _get_recommendation_reason(self, emotion: str, mood_score: float):
        """Generate a reason for the recommendation."""
        reasons = {
            'happy': {
                'en': 'Upbeat music to match your positive mood!',
                'vi': 'Nhạc sôi động phù hợp với tâm trạng tích cực!'
            },
            'sad': {
                'en': 'Comforting music to help you through difficult times',
                'vi': 'Nhạc an ủi giúp bạn vượt qua thời gian khó khăn'
            },
            'angry': {
                'en': 'Intense music to channel your energy',
                'vi': 'Nhạc mạnh mẽ để giải tỏa năng lượng'
            },
            'surprise': {
                'en': 'Energetic music for your excited mood!',
                'vi': 'Nhạc năng động cho tâm trạng phấn khích!'
            },
            'fear': {
                'en': 'Calming music to ease your worries',
                'vi': 'Nhạc êm dịu giúp xoa dịu lo lắng'
            },
            'disgust': {
                'en': 'Music to shift your mood',
                'vi': 'Nhạc giúp thay đổi tâm trạng'
            },
            'neutral': {
                'en': 'Relaxing music for a peaceful moment',
                'vi': 'Nhạc thư giãn cho khoảnh khắc yên bình'
            }
        }
        
        return reasons.get(emotion.lower(), reasons['neutral'])
    
    def get_all_emotions(self):
        """Get list of all emotions with music."""
        return list(self.music_database.keys())
    
    def get_music_count_by_emotion(self):
        """Get count of songs per emotion."""
        return {
            emotion: len(songs) 
            for emotion, songs in self.music_database.items()
        }
