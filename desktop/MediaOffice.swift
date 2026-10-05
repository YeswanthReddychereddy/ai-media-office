import Cocoa
import WebKit

final class StudioDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let url = URL(string: "http://127.0.0.1:4318")!
    var retry: Timer?
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let item = NSMenuItem(); menu.addItem(item)
        let appMenu = NSMenu(); item.submenu = appMenu
        appMenu.addItem(withTitle: "About AI Media Office", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Start Background Company", action: #selector(startCompany), keyEquivalent: "")
        appMenu.addItem(withTitle: "Stop Background Company", action: #selector(stopCompany), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit AI Media Office", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let edit = NSMenuItem(); menu.addItem(edit); let edits = NSMenu(title: "Edit"); edit.submenu = edits
        edits.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edits.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edits.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        NSApplication.shared.mainMenu = menu
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 850), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "AI Media Office"
        window.minSize = NSSize(width: 390, height: 600)
        window.appearance = NSAppearance(named: .darkAqua)
        web = WKWebView(frame: window.contentView!.bounds)
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        window.contentView?.addSubview(web)
        window.center(); window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        startCompany()
        web.load(URLRequest(url: url))
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        webView.loadHTMLString("<html><body style='background:#151b13;color:#c6d6af;font:18px -apple-system;text-align:center;padding-top:25vh'><h1>Opening your studio…</h1><p>Your background company service is starting.</p><p style='font-size:13px'>This app runs independently of Codex.</p></body></html>", baseURL: nil)
        retry?.invalidate(); retry = Timer.scheduledTimer(withTimeInterval: 3, repeats: false) { [weak self] _ in guard let self = self else {return}; self.web.load(URLRequest(url: self.url)) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let dest = navigationAction.request.url else {decisionHandler(.cancel);return}
        if dest.host == "127.0.0.1" || dest.scheme == "about" {decisionHandler(.allow)}
        else if ["https", "http"].contains(dest.scheme ?? "") {NSWorkspace.shared.open(dest);decisionHandler(.cancel)}
        else {decisionHandler(.cancel)}
    }
    @objc func startCompany() {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let load = Process(); load.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        load.arguments = ["bootstrap", "gui/\(getuid())", home + "/Library/LaunchAgents/com.aimediaoffice.studio.plist"]
        try? load.run(); load.waitUntilExit()
        let start = Process(); start.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        start.arguments = ["kickstart", "gui/\(getuid())/com.aimediaoffice.studio"]
        try? start.run()
    }
    @objc func stopCompany() {
        let stop = Process(); stop.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        stop.arguments = ["bootout", "gui/\(getuid())/com.aimediaoffice.studio"]
        try? stop.run()
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = StudioDelegate(); app.delegate = delegate
app.run()
