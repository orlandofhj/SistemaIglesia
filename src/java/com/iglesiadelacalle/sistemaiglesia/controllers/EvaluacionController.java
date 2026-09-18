package com.iglesiadelacalle.sistemaiglesia.controllers;

import com.iglesiadelacalle.sistemaiglesia.dto.EvaluacionTipRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.Curso;
import com.iglesiadelacalle.sistemaiglesia.models.EvaluacionTip;
import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Tip;
import com.iglesiadelacalle.sistemaiglesia.repository.CursoRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.EvaluacionTipRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.TipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/evaluaciones")
@CrossOrigin(origins = "*")
public class EvaluacionController {

    @Autowired private EvaluacionTipRepository evaluacionTipRepository;
    @Autowired private CursoRepository cursoRepository;
    @Autowired private TipRepository tipRepository;
    @Autowired private PersonaRepository personaRepository;

    @PostMapping("/guardar-tips")
    public ResponseEntity<?> guardarEvaluacionTips(@RequestBody EvaluacionTipRequestDTO request) {
        try {
            Curso curso = cursoRepository.findById(request.getIdCurso())
                .orElseThrow(() -> new RuntimeException("El curso no existe."));
            
            // 🛡️ VALIDACIÓN DE AÑO
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();
            if (curso.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar notas de años pasados (" + curso.getAnio() + ").");
            }

            // 🛡️ VALIDACIÓN OBLIGATORIA: Deben venir tantas evaluaciones como estudiantes matriculados
            if (request.getNotas().size() != curso.getEstudiantes().size()) {
                return ResponseEntity.badRequest().body("Debe evaluar obligatoriamente a TODOS los estudiantes inscritos (Aprobado o Reprobado) antes de guardar.");
            }

            Tip tip = tipRepository.findById(request.getIdActividad())
                .orElseThrow(() -> new RuntimeException("El tip no existe."));

            for (EvaluacionTipRequestDTO.NotaEstudianteDTO nota : request.getNotas()) {
                EvaluacionTip evaluacion = evaluacionTipRepository
                    .findByCurso_IdCursoAndTip_IdTipAndEstudiante_IdPersona(curso.getIdCurso(), tip.getIdTip(), nota.getIdEstudiante())
                    .orElse(new EvaluacionTip());

                if (evaluacion.getIdEvaluacionTip() == null) {
                    Persona estudiante = personaRepository.findById(nota.getIdEstudiante())
                        .orElseThrow(() -> new RuntimeException("Estudiante no encontrado."));
                    evaluacion.setCurso(curso);
                    evaluacion.setTip(tip);
                    evaluacion.setEstudiante(estudiante);
                }

                evaluacion.setAprobado(nota.getAprobado());
                evaluacionTipRepository.save(evaluacion);
            }
            return ResponseEntity.ok("Calificaciones actualizadas con éxito.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al procesar: " + e.getMessage());
        }
    }

    @GetMapping("/curso/{idCurso}/tip/{idTip}/notas")
    public ResponseEntity<?> obtenerNotasDeTip(@PathVariable Integer idCurso, @PathVariable Integer idTip) {
        try {
            List<EvaluacionTip> evaluaciones = evaluacionTipRepository.findByCurso_IdCursoAndTip_IdTip(idCurso, idTip);
            
            Map<Integer, Boolean> notasMap = evaluaciones.stream()
                .collect(Collectors.toMap(
                    ev -> ev.getEstudiante().getIdPersona(),
                    EvaluacionTip::getAprobado
                ));
            return ResponseEntity.ok(notasMap);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al cargar las notas del servidor.");
        }
    }

    @GetMapping("/curso/{idCurso}/tips-evaluados")
    public ResponseEntity<?> obtenerTipsEvaluados(@PathVariable Integer idCurso) {
        try {
            List<EvaluacionTip> evaluaciones = evaluacionTipRepository.findByCurso_IdCurso(idCurso);
            List<Integer> tipsIds = evaluaciones.stream()
                .map(ev -> ev.getTip().getIdTip())
                .distinct() 
                .collect(Collectors.toList());
            return ResponseEntity.ok(tipsIds);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al cargar historial.");
        }
    }
}