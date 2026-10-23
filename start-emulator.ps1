
# Get the Android SDK directory from the current Windows user's local application data folder
$Sdk = "$env:LOCALAPPDATA\Android\Sdk"

# Start the Android emulator without opening Android Studio
# -avd Small_Phone      : Select the Small_Phone virtual device
# -no-snapshot          : Disable snapshot loading and saving
# -gpu host             : Attempt to use the host computer's graphics hardware
Start-Process "$Sdk\emulator\emulator.exe" `
    -ArgumentList "-avd Small_Phone -no-snapshot -gpu host"