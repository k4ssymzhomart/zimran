// Lifts every foreground subject out of an image with Apple's Vision framework (macOS 14+),
// and writes a PNG with a transparent background. usage: swift lift.swift <in.png> <out.png>
import AppKit
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: lift <in> <out>\n".data(using: .utf8)!)
  exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])

guard let input = CIImage(contentsOf: inURL) else { fatalError("cannot read \(args[1])") }
let handler = VNImageRequestHandler(ciImage: input, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else { fatalError("no subject found in \(args[1])") }

// All instances together, at the full input size, as a soft matte.
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
let lifted = CIImage(cvPixelBuffer: buffer)

let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
guard let cg = context.createCGImage(lifted, from: lifted.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else {
  fatalError("render failed")
}
let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else { fatalError("png encode failed") }
try png.write(to: outURL)
print("lifted \(result.allInstances.count) subject(s) -> \(args[2])")
