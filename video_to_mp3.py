# Converts the videos to mp3 
import os 
import subprocess

files = os.listdir("Videos") 
for file in files: 
    Video_number = file.split(".")[0]
    Video_name = file.split(".")[1]
    print( Video_number,  Video_name)
    subprocess.run(["ffmpeg", "-i", f"Videos/{file}", f"Audios/{Video_number}_{Video_name}.mp3"])