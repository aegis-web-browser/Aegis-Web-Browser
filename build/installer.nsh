; Register Aegis as an OPTIONAL Windows PDF "Open with..." application.
; Keep existing per-user NSIS installs and never replace the default .pdf app.
!macro customInstall
  WriteRegStr HKCU "Software\Classes\Applications\Aegis Web.exe" "FriendlyAppName" "Aegis Web"
  WriteRegStr HKCU "Software\Classes\Applications\Aegis Web.exe\SupportedTypes" ".pdf" ""
  WriteRegStr HKCU "Software\Classes\Applications\Aegis Web.exe\shell\open\command" "" '"$INSTDIR\Aegis Web.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\AegisWeb.PDF" "" "Document PDF (Aegis Web)"
  WriteRegStr HKCU "Software\Classes\AegisWeb.PDF\DefaultIcon" "" '"$INSTDIR\Aegis Web.exe",0'
  WriteRegStr HKCU "Software\Classes\AegisWeb.PDF\shell\open\command" "" '"$INSTDIR\Aegis Web.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.pdf\OpenWithProgids" "AegisWeb.PDF" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Classes\.pdf\OpenWithProgids" "AegisWeb.PDF"
  DeleteRegKey HKCU "Software\Classes\AegisWeb.PDF"
  DeleteRegKey HKCU "Software\Classes\Applications\Aegis Web.exe"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
