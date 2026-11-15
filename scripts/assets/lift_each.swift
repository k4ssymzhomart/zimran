// Lifts every foreground subject of an image into its own transparent PNG: <out-prefix>-<n>.png, n from 1.
// usage: lift_each <in.png> <out-prefix>
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 3, let image = NSImage(contentsOfFile: args[1]),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write("usage: lift_each <in> <out-prefix>\n".data(using: .utf8)!)
  exit(1)
}
let handler = VNImageRequestHandler(cgImage: cg)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { print("no subject"); exit(2) }
let ctx = CIContext()
for i in result.allInstances.sorted() {
  let buffer = try result.generateMaskedImage(ofInstances: IndexSet(integer: i), from: handler, croppedToInstancesExtent: false)
  let ci = CIImage(cvPixelBuffer: buffer)
  let url = URL(fileURLWithPath: "\(args[2])-\(i).png")
  try ctx.writePNGRepresentation(of: ci, to: url, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
  print("instance \(i) -> \(url.path)")
}
