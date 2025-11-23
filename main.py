import os
import yaml

def define_env(env):
    """
    This is the hook for defining variables, macros and filters.

    - variables: the dictionary that contains the environment variables
    - macro: a decorator function, to declare a macro.
    """

    # Load podcasts data
    podcasts_file = os.path.join(os.path.dirname(__file__), 'docs/series/podcasts.yml')
    try:
        with open(podcasts_file, 'r', encoding='utf-8') as f:
            podcasts_data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading podcasts.yml: {e}")
        podcasts_data = {}

    @env.macro
    def podcast_player(series_id):
        """
        Generates the HTML for the podcast player for a given series.
        """
        if series_id not in podcasts_data:
            return f'<div class="admonition warning"><p class="admonition-title">Warning</p><p>Podcast data not found for series: {series_id}</p></div>'

        data = podcasts_data[series_id]
        audio_file = data.get('audio_file', '')
        spotify_url = data.get('spotify_url', '')

        # Construct the HTML/Markdown
        # We use markdown="1" on the container to allow processing of the inner markdown (like the button)
        html = f"""
<div class="podcast-player" markdown="1">
<audio controls style="width: 100%;">
    <source src="/{audio_file}" type="audio/mpeg">
    Tu navegador no soporta el elemento de audio.
</audio>

<br>

[:simple-spotify: Escuchar en Spotify]({spotify_url}){{: .md-button .md-button--primary }}
</div>
"""
        return html

    @env.macro
    def video_gallery(series_dirname):
        """
        Generates HTML for all videos in docs/series/{series_dirname}/videos/
        """
        # Define path relative to the project root
        # We assume the structure is docs/series/{series_dirname}/videos
        videos_dir_rel = f'docs/series/{series_dirname}/videos'
        videos_dir_abs = os.path.join(os.path.dirname(__file__), videos_dir_rel)

        if not os.path.exists(videos_dir_abs):
            return f"<!-- No videos directory found at {videos_dir_rel} -->"

        video_files = [f for f in os.listdir(videos_dir_abs) if f.lower().endswith(('.mp4', '.webm', '.mov'))]
        video_files.sort()

        if not video_files:
            return f"<!-- No video files found in {videos_dir_rel} -->"

        html = '<div class="video-gallery" style="display: grid; gap: 20px; margin-top: 20px;">'
        for vid in video_files:
            # Construct the absolute web path
            # /series/{series_dirname}/videos/{vid}
            video_src = f"/series/{series_dirname}/videos/{vid}"
            
            # Clean up filename for display
            title = vid.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
            
            html += f"""
            <div class="video-container">
                <video controls style="width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <source src="{video_src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p style="text-align: center; font-size: 0.9em; color: var(--md-default-fg-color--light); margin-top: 5px;">{title}</p>
            </div>
            """
        html += '</div>'
        return html
