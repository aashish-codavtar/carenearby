# Run this ONCE from an Admin PowerShell on Windows
# It forwards port 8081 (Expo Metro) from your Windows IP to WSL

$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
Write-Host "WSL IP: $wslIp"

# Remove old rule if exists
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=0.0.0.0 2>$null

# Add port proxy: Windows 8081 → WSL 8081
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wslIp

# Allow port 8081 through Windows Firewall
netsh advfirewall firewall delete rule name="Expo Metro WSL" 2>$null
netsh advfirewall firewall add rule name="Expo Metro WSL" dir=in action=allow protocol=TCP localport=8081

Write-Host ""
Write-Host "Done! Port 8081 is now forwarded from Windows to WSL ($wslIp)"
Write-Host "Your phone can reach Expo at: http://192.168.1.96:8081"
