//go:build windows

// Package gui implementa la interfaz Win32 del Fusionador de Audio con
// syscalls directos del estándar (D-02): sin frameworks ni dependencias.
package gui

import (
        "syscall"
        "unsafe"
)

// ---- DLLs ----

var (
        user32   = syscall.NewLazyDLL("user32.dll")
        kernel32 = syscall.NewLazyDLL("kernel32.dll")
        gdi32    = syscall.NewLazyDLL("gdi32.dll")
        comdlg32 = syscall.NewLazyDLL("comdlg32.dll")
        comctl32 = syscall.NewLazyDLL("comctl32.dll")
        shell32  = syscall.NewLazyDLL("shell32.dll")
)

// ---- user32 ----

var (
        procRegisterClassExW      = user32.NewProc("RegisterClassExW")
        procCreateWindowExW       = user32.NewProc("CreateWindowExW")
        procDefWindowProcW        = user32.NewProc("DefWindowProcW")
        procGetMessageW           = user32.NewProc("GetMessageW")
        procTranslateMessage      = user32.NewProc("TranslateMessage")
        procDispatchMessageW      = user32.NewProc("DispatchMessageW")
        procPostMessageW          = user32.NewProc("PostMessageW")
        procSendMessageW          = user32.NewProc("SendMessageW")
        procDestroyWindow         = user32.NewProc("DestroyWindow")
        procShowWindow            = user32.NewProc("ShowWindow")
        procUpdateWindow          = user32.NewProc("UpdateWindow")
        procGetClientRect         = user32.NewProc("GetClientRect")
        procMoveWindow            = user32.NewProc("MoveWindow")
        procSetWindowTextW        = user32.NewProc("SetWindowTextW")
        procEnableWindow          = user32.NewProc("EnableWindow")
        procMessageBoxW           = user32.NewProc("MessageBoxW")
        procLoadCursorW           = user32.NewProc("LoadCursorW")
        procLoadIconW             = user32.NewProc("LoadIconW")
        procSetCursor             = user32.NewProc("SetCursor")
        procPostQuitMessage       = user32.NewProc("PostQuitMessage")
        procGetModuleHandleW      = kernel32.NewProc("GetModuleHandleW")
        procCreateFontW           = gdi32.NewProc("CreateFontW")
        procGetDC                 = user32.NewProc("GetDC")
        procReleaseDC             = user32.NewProc("ReleaseDC")
        procGetDeviceCaps         = gdi32.NewProc("GetDeviceCaps")
        procSetFocus              = user32.NewProc("SetFocus")
        procCreateMenu            = user32.NewProc("CreateMenu")
        procCreatePopupMenu       = user32.NewProc("CreatePopupMenu")
        procAppendMenuW           = user32.NewProc("AppendMenuW")
        procSetMenu               = user32.NewProc("SetMenu")
        procTrackPopupMenu        = user32.NewProc("TrackPopupMenu")
        procGetCursorPos          = user32.NewProc("GetCursorPos")
        procScreenToClient        = user32.NewProc("ScreenToClient")
        procCreateAcceleratorW    = user32.NewProc("CreateAcceleratorTableW")
        procTranslateAcceleratorW = user32.NewProc("TranslateAcceleratorW")
        procGetForegroundWindow   = user32.NewProc("GetForegroundWindow")
        procInitCommonControlsEx  = comctl32.NewProc("InitCommonControlsEx")
        procSetCapture            = user32.NewProc("SetCapture")
        procReleaseCapture        = user32.NewProc("ReleaseCapture")
        procDragAcceptFiles       = shell32.NewProc("DragAcceptFiles")
        procDragQueryFileW        = shell32.NewProc("DragQueryFileW")
        procDragFinish            = shell32.NewProc("DragFinish")
)

// ---- Constantes Win32 ----

const (
        // mensajes
        WM_NULL        = 0x0000
        WM_CREATE      = 0x0001
        WM_DESTROY     = 0x0002
        WM_CLOSE       = 0x0010
        WM_SETTEXT     = 0x000C
        WM_COMMAND     = 0x0111
        WM_SIZE        = 0x0005
        WM_NOTIFY      = 0x004E
        WM_SETFONT     = 0x0030
        WM_APP         = 0x8000
        WM_CONTEXTMENU = 0x007B
        WM_DROPFILES   = 0x0233
        WM_KEYDOWN     = 0x0100

        // ratón (arrastre interno de reordenación, D-18)
        WM_MOUSEMOVE      = 0x0200
        WM_LBUTTONUP      = 0x0202
        WM_CAPTURECHANGED = 0x0215

        // ventana
        WS_OVERLAPPEDWINDOW = 0x00CF0000
        WS_VISIBLE          = 0x10000000
        WS_CHILD            = 0x40000000
        WS_TABSTOP          = 0x00010000
        WS_CLIPSIBLINGS     = 0x04000000
        WS_BORDER           = 0x00800000
        WS_VSCROLL          = 0x00200000
        WS_HSCROLL          = 0x00100000
        CW_USEDEFAULT       = 0x80000000

        // botones
        BS_PUSHBUTTON    = 0x00000000
        BS_DEFPUSHBUTTON = 0x00000001
        BN_CLICKED       = 0

        // combobox
        CBS_DROPDOWNLIST = 0x0003
        CB_ADDSTRING     = 0x0143
        CB_GETCURSEL     = 0x0147
        CB_SETCURSEL     = 0x014E
        CBN_SELCHANGE    = 1

        // listview
        LVS_REPORT                   = 0x0001
        LVS_SHOWSELALWAYS            = 0x0008
        LVS_EX_FULLROWSELECT         = 0x00000020
        LVS_EX_DOUBLEBUFFER          = 0x00010000
        LVM_FIRST                    = 0x1000
        LVM_GETITEMRECT             = LVM_FIRST + 14 // D-19: era +15 (= LVM_SETITEMPOSITION) → el refino «mitad de fila» nunca se aplicaba
        LVM_HITTEST                 = LVM_FIRST + 18
        LVM_SETITEMW                = LVM_FIRST + 76 // D-17: era +78 (= LVM_GETTOOLTIPS, lectura) → columnas 1..4 nunca se pintaban
        LVM_INSERTITEMW             = LVM_FIRST + 77
        LVM_SETITEMSTATE            = LVM_FIRST + 43 // D-17: era +75 (LVM_GETITEMW) → la selección programática nunca surtía efecto
        LVM_DELETEITEM              = LVM_FIRST + 8
        LVM_DELETEALLITEMS          = LVM_FIRST + 9
        LVM_INSERTCOLUMNW           = LVM_FIRST + 97
        LVM_SETCOLUMNWIDTH          = LVM_FIRST + 30
        LVM_GETNEXTITEM             = LVM_FIRST + 12
        LVM_GETSELECTEDCOUNT        = LVM_FIRST + 50 // verificado contra commctrl.h real (wine): +50 es correcto; la reconstrucción «+48» del árbitro 1.0.2 era errónea
        LVM_GETSELECTIONMARK        = LVM_FIRST + 66
        LVM_ENSUREVISIBLE           = LVM_FIRST + 19
        LVM_SETEXTENDEDLISTVIEWSTYLE = LVM_FIRST + 54
        LVM_SETINSERTMARK           = LVM_FIRST + 166
        LVIR_BOUNDS                 = 0
        LVIM_AFTER                  = 0x00000001
        LVIF_TEXT                    = 0x0001
        LVIF_STATE                   = 0x0002
        LVIS_SELECTED                = 0x0002
        LVIS_FOCUSED                 = 0x0001
        LVCF_TEXT                    = 0x0004
        LVCF_WIDTH                   = 0x0002
        LVNI_SELECTED                = 0x0002
        LVCFMT_LEFT                  = 0x0000

        // notify
        NM_FIRST        = 0
        LVN_FIRST       = -100
        LVN_ITEMCHANGED = LVN_FIRST - 1
        LVN_BEGINDRAG   = LVN_FIRST - 9

        // messagebox
        MB_OK              = 0x00000000
        MB_YESNO           = 0x00000004
        MB_ICONERROR       = 0x00000010
        MB_ICONQUESTION    = 0x00000020
        MB_ICONWARNING     = 0x00000030
        MB_ICONINFORMATION = 0x00000040
        IDYES              = 6

        // cursores
        IDC_ARROW = 32512
        IDC_WAIT  = 32514

        // ShowWindow
        SW_SHOWNORMAL = 1

        // DPI
        LOGPIXELSX = 88

        // fuente
        FW_NORMAL         = 400
        DEFAULT_CHARSET   = 1
        CLEARTYPE_QUALITY = 5
        DEFAULT_PITCH     = 0

        // comdlg32
        OFN_ALLOWMULTISELECT = 0x00000200
        OFN_EXPLORER         = 0x00080000
        OFN_FILEMUSTEXIST    = 0x00001000
        OFN_PATHMUSTEXIST    = 0x00000800
        OFN_HIDEREADONLY     = 0x00000004
        OFN_OVERWRITEPROMPT  = 0x00000002
        OFN_NOCHANGEDIR      = 0x00000008

        // menú
        MF_STRING       = 0x00000000
        MF_SEPARATOR    = 0x00000800
        MF_POPUP        = 0x00000010
        TPM_RIGHTBUTTON = 0x0002
        TPM_RETURNCMD   = 0x0100

        // aceleradores
        FVIRTKEY  = 0x01
        FCONTROL  = 0x08
        FALT      = 0x10
        VK_DELETE = 0x2E
        VK_UP     = 0x26
        VK_DOWN   = 0x28
        VK_F1     = 0x70
        VK_RETURN = 0x0D
)

// ---- Estructuras ----

type WNDCLASSEXW struct {
        CbSize        uint32
        Style         uint32
        LpfnWndProc   uintptr
        CbClsExtra    int32
        CbWndExtra    int32
        HInstance     uintptr
        HIcon         uintptr
        HCursor       uintptr
        HbrBackground uintptr
        LpszMenuName  *uint16
        LpszClassName *uint16
        HIconSm       uintptr
}

type POINT struct {
        X, Y int32
}

type MSG struct {
        Hwnd     uintptr
        Message  uint32
        WParam   uintptr
        LParam   uintptr
        Time     uint32
        Pt       POINT
        LPrivate uint32
}

type NMHDR struct {
        HwndFrom uintptr
        IdFrom   uintptr
        Code     int32
}

type NMLISTVIEW struct {
        Hdr       NMHDR
        IItem     int32
        ISubItem  int32
        UNewState uint32
        UOldState uint32
        UChanged  uint32
        PtAction  POINT
        LParam    uintptr
}

type LVITEMW struct {
        Mask       uint32
        IItem      int32
        ISubItem   int32
        State      uint32
        StateMask  uint32
        PszText    *uint16
        CchTextMax int32
        IImage     int32
        LParam     uintptr
        IIndent    int32
        IGroupId   int32
        CColumns   uint32
        PuColumns  uintptr
}

type LVCOLUMNW struct {
        Mask       uint32
        Fmt        int32
        Cx         int32
        PszText    *uint16
        CchTextMax int32
        ISubItem   int32
        IImage     int32
        IOrder     int32
}

type RECT struct {
        Left, Top, Right, Bottom int32
}

// LVHITTESTINFO (commctrl.h, x64: 24 B).
type LVHITTESTINFO struct {
        Pt       POINT
        Flags    uint32
        IItem    int32
        ISubItem int32
        IGroup   int32
}

// LVINSERTMARK (commctrl.h real, x64: 16 B). CbSize DEBE valer sizeof(LVINSERTMARK)
// o LVM_SETINSERTMARK devuelve FALSE sin pintar nada (D-19: la 1.0.2 la definió sin
// CbSize → la marca de inserción jamás se veía). DwFlags usa LVIM_AFTER; DwReserved a 0.
type LVINSERTMARK struct {
        CbSize     uint32
        DwFlags    uint32
        IItem      int32
        DwReserved uint32
}

type OPENFILENAMEW struct {
        LStructSize       uint32
        HwndOwner         uintptr
        HInstance         uintptr
        LpstrFilter       *uint16
        LpstrCustomFilter *uint16
        NMaxCustFilter    uint32
        NFilterIndex      uint32
        LpstrFile         *uint16
        NMaxFile          uint32
        LpstrFileTitle    *uint16
        NMaxFileTitle     uint32
        LpstrInitialDir   *uint16
        LpstrTitle        *uint16
        Flags             uint32
        NFileOffset       uint16
        NFileExtension    uint16
        LpstrDefExt       *uint16
        LCustData         uintptr
        LpfnHook          uintptr
        LpTemplateName    *uint16
        PvReserved        uintptr
        DwReserved        uint32
        FlagsEx           uint32
}

type ACCEL struct {
        FVirt uint8
        Key   uint16
        Cmd   uint16
}

type INITCOMMONCONTROLSEX struct {
        DwSize uint32
        DwICC  uint32
}

// ---- Wrappers ----

func utf16p(s string) *uint16 {
        p, err := syscall.UTF16PtrFromString(s)
        if err != nil {
                return nil
        }
        return p
}

func hiWord(v uintptr) uint32 { return uint32(v >> 16) }
func loWord(v uintptr) uint32 { return uint32(v & 0xFFFF) }

func sendMessage(h uintptr, msg uint32, wp, lp uintptr) uintptr {
        r, _, _ := procSendMessageW.Call(h, uintptr(msg), wp, lp)
        return r
}

func postMessage(h uintptr, msg uint32, wp, lp uintptr) bool {
        r, _, _ := procPostMessageW.Call(h, uintptr(msg), wp, lp)
        return r != 0
}

func messageBox(h uintptr, texto, titulo string, flags uint32) int {
        r, _, _ := procMessageBoxW.Call(h,
                uintptr(unsafe.Pointer(utf16p(texto))),
                uintptr(unsafe.Pointer(utf16p(titulo))),
                uintptr(flags))
        return int(r)
}

func getClientRect(h uintptr) (int32, int32) {
        var r struct{ Left, Top, Right, Bottom int32 }
        procGetClientRect.Call(h, uintptr(unsafe.Pointer(&r)))
        return r.Right, r.Bottom
}

func moveWindow(h uintptr, x, y, w, hi int32, repaint bool) {
        procMoveWindow.Call(h, uintptr(x), uintptr(y), uintptr(w), uintptr(hi),
                boolToUintptr(repaint))
}

func boolToUintptr(b bool) uintptr {
        if b {
                return 1
        }
        return 0
}

func setWindowText(h uintptr, s string) {
        procSetWindowTextW.Call(h, uintptr(unsafe.Pointer(utf16p(s))))
}

func enableWindow(h uintptr, on bool) {
        procEnableWindow.Call(h, boolToUintptr(on))
}

// dpiPantalla devuelve el DPI lógico (96 = 100 %).
func dpiPantalla() int32 {
        hdc, _, _ := procGetDC.Call(0)
        if hdc == 0 {
                return 96
        }
        defer procReleaseDC.Call(0, hdc)
        d, _, _ := procGetDeviceCaps.Call(hdc, LOGPIXELSX)
        return int32(d)
}

// escala multiplica un valor base-96 por el factor DPI.
func escala(v int32, dpi int32) int32 {
        return v * dpi / 96
}

// ventanaFuente crea «Segoe UI» al tamaño de punto dado.
func ventanaFuente(dpi int32, puntos int32) uintptr {
        altura := -puntos * dpi / 72
        r, _, _ := procCreateFontW.Call(
                uintptr(altura), 0, 0, 0, uintptr(FW_NORMAL), 0, 0, 0,
                uintptr(DEFAULT_CHARSET), 0, 0, uintptr(CLEARTYPE_QUALITY), uintptr(DEFAULT_PITCH),
                uintptr(unsafe.Pointer(utf16p("Segoe UI"))))
        return r
}
