@echo off
rem Starts LabsCode (Lite or full) from this folder. Settings and extensions stay in LabsCode\data (portable).
start "" "%~dp0LabsCode\LabsCode.exe" %*
